import { parseTags } from './torrents';

export const EDITOR_FIELD_KEYS = [
  'name',
  'save_path',
  'category',
  'tags',
  'comment',
  'dl_limit',
  'up_limit',
  'ratio_limit',
  'seeding_time_limit',
  'inactive_seeding_time_limit',
  'share_limit_action',
  'auto_tmm',
  'seq_dl',
  'f_l_piece_prio',
  'force_start',
  'super_seeding',
];

const BOOLEAN_FIELDS = new Set([
  'auto_tmm',
  'seq_dl',
  'f_l_piece_prio',
  'force_start',
  'super_seeding',
]);

export function compareApiVersions(left, right) {
  const leftParts = String(left || '').split('.').map(part => Number(part) || 0);
  const rightParts = String(right || '').split('.').map(part => Number(part) || 0);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (difference) {
      return difference;
    }
  }
  return 0;
}

export function supportsTorrentComments(apiVersion) {
  return compareApiVersions(apiVersion, '2.12.1') >= 0;
}

export function usesCurrentTrackerEditParameter(apiVersion) {
  return compareApiVersions(apiVersion, '2.13.0') >= 0;
}

function normalizedValue(torrent, key) {
  if (key === 'tags') {
    return parseTags(torrent.tags).slice().sort((left, right) => left.localeCompare(right)).join(', ');
  }
  return torrent[key];
}

export function getCommonTorrentFields(torrents, apiVersion = '') {
  if (!torrents.length) {
    return {};
  }

  const fields = {};
  EDITOR_FIELD_KEYS.forEach(key => {
    if (key === 'comment' && !supportsTorrentComments(apiVersion)) {
      return;
    }
    const supported = torrents.every(torrent => torrent[key] !== undefined && torrent[key] !== null);
    if (!supported) {
      return;
    }
    const first = normalizedValue(torrents[0], key);
    const common = torrents.every(torrent => Object.is(normalizedValue(torrent, key), first));
    fields[key] = {
      common,
      value: key === 'tags' ? parseTags(torrents[0].tags).join(', ') : torrents[0][key],
    };
  });
  return fields;
}

export function createTorrentEditorDraft(commonFields) {
  return Object.fromEntries(
    Object.entries(commonFields)
      .filter(([, field]) => field.common)
      .map(([key, field]) => [key, BOOLEAN_FIELDS.has(key) ? Boolean(field.value) : field.value])
  );
}

export function getChangedTorrentFields(initialDraft, draft) {
  return Object.fromEntries(
    Object.entries(draft).filter(([key, value]) => !Object.is(value, initialDraft[key]))
  );
}

export function editableTrackers(trackers) {
  return (trackers || []).filter(tracker => {
    const url = typeof tracker === 'string' ? tracker : tracker.url;
    return url && !/^\*\* \[(DHT|PeX|LSD)\] \*\*$/i.test(url);
  });
}

export function buildTrackerUnion(torrents, trackersByHash) {
  const union = new Map();
  torrents.forEach(torrent => {
    editableTrackers(trackersByHash[torrent.hash]).forEach(tracker => {
      const item = typeof tracker === 'string' ? { url: tracker } : tracker;
      const current = union.get(item.url) || { ...item, hashes: [] };
      current.hashes.push(torrent.hash);
      union.set(item.url, current);
    });
  });
  return Array.from(union.values()).sort((left, right) => left.url.localeCompare(right.url));
}

export function parseTrackerDraft(value) {
  return Array.from(new Set(
    String(value || '')
      .split(/\r?\n/)
      .map(url => url.trim())
      .filter(Boolean)
  ));
}
