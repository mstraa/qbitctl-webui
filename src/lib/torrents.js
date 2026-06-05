import { formatPercent, formatRatio } from './format';

function isDownloading(state) {
  return ['downloading', 'metaDL', 'forcedDL', 'allocating'].includes(state);
}

function isSeeding(state) {
  return ['uploading', 'forcedUP', 'stalledUP', 'queuedUP'].includes(state);
}

function isStopped(state) {
  const normalized = String(state || '').toLowerCase();
  return normalized.includes('paused') || normalized.includes('stopped');
}

function isStalled(state) {
  return state === 'stalledDL';
}

export function isActive(torrent) {
  return (torrent.dlspeed || 0) > 0 || (torrent.upspeed || 0) > 0;
}

// Single source of truth for the sidebar state filters: both the torrent
// list and the per-filter counts go through these predicates.
const STATE_FILTERS = {
  all: () => true,
  active: torrent => isActive(torrent),
  downloading: torrent => isDownloading(torrent.state),
  seeding: torrent => isSeeding(torrent.state),
  stopped: torrent => isStopped(torrent.state),
  stalled: torrent => isStalled(torrent.state),
};

export function matchesStateFilter(torrent, filter) {
  const predicate = STATE_FILTERS[filter];
  return predicate ? predicate(torrent) : false;
}

export function countForFilter(torrents, filter) {
  return torrents.filter(torrent => matchesStateFilter(torrent, filter)).length;
}

export function statusTone(torrent) {
  if (isStopped(torrent.state)) return 'muted';
  if (isStalled(torrent.state)) return 'warning';
  if (isDownloading(torrent.state)) return 'active';
  if (isSeeding(torrent.state)) return 'seeding';
  return 'muted';
}

export function formatStatus(torrentOrState) {
  const state = typeof torrentOrState === 'string' ? torrentOrState : torrentOrState.state;
  if (state === 'stalledDL') return 'Stalled';
  if (['uploading', 'forcedUP', 'stalledUP', 'queuedUP'].includes(state)) return 'Seeding';
  const labels = {
    allocating: 'Allocating',
    checkingDL: 'Checking',
    checkingUP: 'Checking',
    downloading: 'Downloading',
    error: 'Error',
    forcedDL: 'Forced download',
    metaDL: 'Metadata',
    missingFiles: 'Missing files',
    moving: 'Moving',
    pausedDL: 'Stopped',
    pausedUP: 'Stopped',
    queuedDL: 'Queued',
    stoppedDL: 'Stopped',
    stoppedUP: 'Stopped',
  };
  return labels[state] || String(state || 'Unknown').replace(/DL|UP/g, '');
}

export function parseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter(Boolean);
  return String(tags).split(',').map(tag => tag.trim()).filter(Boolean);
}

export function formatNameMeta(torrent) {
  return [torrent.category, parseTags(torrent.tags).join(', ')].filter(Boolean).join(' | ');
}

export function searchableTorrentText(torrent) {
  return [
    torrent.name,
    torrent.category,
    torrent.save_path,
    torrent.hash,
    parseTags(torrent.tags).join(' '),
    formatStatus(torrent),
    formatRatio(torrent.ratio),
  ].filter(Boolean).join(' ').toLowerCase();
}

export function formatSeedPeerCount(torrent) {
  const seeds = Number.isFinite(torrent.num_complete)
    ? torrent.num_complete
    : torrent.num_seeds;
  const peers = Number.isFinite(torrent.num_incomplete)
    ? torrent.num_incomplete
    : torrent.num_leechs;
  return `${seeds || 0} / ${peers || 0}`;
}

export function compareTorrents(left, right, sort) {
  const direction = sort.direction === 'asc' ? 1 : -1;
  const a = sortValue(left, sort.key);
  const b = sortValue(right, sort.key);
  if (typeof a === 'number' && typeof b === 'number') {
    return (a - b) * direction;
  }
  return String(a).localeCompare(String(b)) * direction;
}

function sortValue(torrent, key) {
  if (key === 'state') return formatStatus(torrent);
  if (key === 'name') return torrent.name || '';
  if (key === 'priority') {
    // Unqueued torrents (priority 0/-1) always sort below queued ones.
    return torrent.priority > 0 ? torrent.priority : Number.MAX_SAFE_INTEGER;
  }
  return torrent[key] || 0;
}

export function getPreviewMeta(torrent) {
  return { properties: {}, trackers: torrent.trackers || [], files: torrent.files || [], peers: {} };
}

export function getTrackers(torrent, meta) {
  const trackers = meta.trackers && meta.trackers.length ? meta.trackers : torrent.trackers;
  const normalized = (trackers || [])
    .map(tracker => normalizeTracker(tracker))
    .filter(tracker => tracker.url);
  return torrent.private
    ? normalized.filter(tracker => !isLocalDiscoveryTracker(tracker.url))
    : normalized;
}

function normalizeTracker(tracker) {
  if (typeof tracker === 'string') {
    return { url: tracker, msg: '', status: null };
  }
  return {
    url: tracker.url || tracker.msg || '',
    msg: tracker.msg || '',
    status: tracker.status,
    num_seeds: tracker.num_seeds,
    num_peers: tracker.num_peers,
  };
}

function isLocalDiscoveryTracker(url) {
  return /\*\* \[(DHT|PeX|LSD)\] \*\*/i.test(url);
}

export function trackerStatusLabel(tracker) {
  const labels = {
    0: 'disabled',
    1: 'not contacted',
    2: 'working',
    3: 'updating',
    4: 'not working',
  };
  return labels[tracker.status] || 'tracker';
}

export function trackerStatusTone(tracker) {
  if (tracker.status === 2) return 'ok';
  if (tracker.status === 3) return 'warn';
  if (tracker.status === 4) return 'error';
  return 'muted';
}

export function formatTrackerCounts(tracker) {
  const seeds = Number.isFinite(tracker.num_seeds) && tracker.num_seeds >= 0 ? tracker.num_seeds : '?';
  const peers = Number.isFinite(tracker.num_peers) && tracker.num_peers >= 0 ? tracker.num_peers : '?';
  return `seeds ${seeds} / peers ${peers}`;
}

export function getPeers(meta) {
  const peers = Object.entries(meta.peers || {}).map(([address, peer]) => {
    const ip = peer.ip || address.split(':').slice(0, -1).join(':') || address;
    return [ip, formatPercent(peer.progress)];
  });
  return peers.length ? peers : [['No peers reported', '--']];
}

export function getFiles(torrent, meta) {
  const files = meta.files && meta.files.length ? meta.files : torrent.files;
  if (files && files.length) {
    return files.map(file => ({
      name: file.name || file[0] || 'unknown',
      size: file.size || file[1] || 0,
    }));
  }
  return [{ name: torrent.name, size: torrent.size }];
}

export function getExternalAddress(serverState) {
  return serverState.last_external_address_v4 ||
    serverState.last_external_address_v6 ||
    'unknown';
}
