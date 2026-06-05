import {
  compareTorrents,
  countForFilter,
  formatNameMeta,
  formatSeedPeerCount,
  formatStatus,
  formatTrackerCounts,
  getExternalAddress,
  getFiles,
  getPeers,
  getPreviewMeta,
  getTrackers,
  isActive,
  matchesStateFilter,
  parseTags,
  searchableTorrentText,
  statusTone,
  trackerStatusLabel,
  trackerStatusTone,
} from './torrents';

const FIXTURE = [
  { hash: 'a', name: 'alpha', state: 'downloading', dlspeed: 100, upspeed: 0, priority: 1 },
  { hash: 'b', name: 'bravo', state: 'stalledDL', dlspeed: 0, upspeed: 0, priority: 2 },
  { hash: 'c', name: 'charlie', state: 'uploading', dlspeed: 0, upspeed: 50, priority: 0 },
  { hash: 'd', name: 'delta', state: 'pausedDL', dlspeed: 0, upspeed: 0, priority: 3 },
];

test('matchesStateFilter maps each sidebar filter to the right states', () => {
  expect(matchesStateFilter(FIXTURE[0], 'all')).toBe(true);
  expect(matchesStateFilter(FIXTURE[3], 'all')).toBe(true);
  expect(matchesStateFilter(FIXTURE[0], 'downloading')).toBe(true);
  expect(matchesStateFilter(FIXTURE[1], 'downloading')).toBe(false);
  expect(matchesStateFilter(FIXTURE[2], 'seeding')).toBe(true);
  expect(matchesStateFilter({ state: 'queuedUP' }, 'seeding')).toBe(true);
  expect(matchesStateFilter(FIXTURE[3], 'stopped')).toBe(true);
  expect(matchesStateFilter({ state: 'stoppedUP' }, 'stopped')).toBe(true);
  expect(matchesStateFilter(FIXTURE[1], 'stalled')).toBe(true);
  expect(matchesStateFilter(FIXTURE[0], 'stalled')).toBe(false);
  expect(matchesStateFilter(FIXTURE[0], 'active')).toBe(true);
  expect(matchesStateFilter(FIXTURE[1], 'active')).toBe(false);
  expect(matchesStateFilter(FIXTURE[0], 'bogus')).toBe(false);
});

test('countForFilter counts through the same predicates as the list', () => {
  expect(countForFilter(FIXTURE, 'all')).toBe(4);
  expect(countForFilter(FIXTURE, 'downloading')).toBe(1);
  expect(countForFilter(FIXTURE, 'seeding')).toBe(1);
  expect(countForFilter(FIXTURE, 'stopped')).toBe(1);
  expect(countForFilter(FIXTURE, 'stalled')).toBe(1);
  expect(countForFilter(FIXTURE, 'active')).toBe(2);
});

test('formatStatus folds qBittorrent states into display labels', () => {
  expect(formatStatus('stalledDL')).toBe('Stalled');
  expect(formatStatus('uploading')).toBe('Seeding');
  expect(formatStatus('queuedUP')).toBe('Seeding');
  expect(formatStatus('pausedDL')).toBe('Stopped');
  expect(formatStatus('stoppedUP')).toBe('Stopped');
  expect(formatStatus('queuedDL')).toBe('Queued');
  expect(formatStatus({ state: 'downloading' })).toBe('Downloading');
  expect(formatStatus('')).toBe('Unknown');
  // Unknown states fall back to the raw state with DL/UP suffixes stripped.
  expect(formatStatus('somethingDL')).toBe('something');
});

test('statusTone picks the badge tone by state family', () => {
  expect(statusTone({ state: 'pausedDL' })).toBe('muted');
  expect(statusTone({ state: 'stalledDL' })).toBe('warning');
  expect(statusTone({ state: 'downloading' })).toBe('active');
  expect(statusTone({ state: 'uploading' })).toBe('seeding');
  expect(statusTone({ state: 'error' })).toBe('muted');
});

test('parseTags splits, trims, and drops empties', () => {
  expect(parseTags('')).toEqual([]);
  expect(parseTags(null)).toEqual([]);
  expect(parseTags('linux, mirror')).toEqual(['linux', 'mirror']);
  expect(parseTags(' a ,, b ')).toEqual(['a', 'b']);
  expect(parseTags(['x', '', 'y'])).toEqual(['x', 'y']);
});

test('formatNameMeta joins category and tags when present', () => {
  expect(formatNameMeta({ category: 'linux', tags: 'a, b' })).toBe('linux | a, b');
  expect(formatNameMeta({ category: '', tags: 'a' })).toBe('a');
  expect(formatNameMeta({ category: 'work', tags: '' })).toBe('work');
});

test('searchableTorrentText matches name, hash, category, tag, and status', () => {
  const text = searchableTorrentText({
    name: 'Arch.ISO', category: 'Linux', save_path: '/data', hash: 'ABC123',
    tags: 'mirror', state: 'downloading', ratio: 0.47,
  });
  ['arch.iso', 'linux', 'abc123', 'mirror', 'downloading', '0.47'].forEach(needle => {
    expect(text).toContain(needle);
  });
});

test('formatSeedPeerCount prefers swarm totals over connected counts', () => {
  expect(formatSeedPeerCount({ num_complete: 12, num_incomplete: 41, num_seeds: 1, num_leechs: 2 })).toBe('12 / 41');
  expect(formatSeedPeerCount({ num_seeds: 91, num_leechs: 14 })).toBe('91 / 14');
  expect(formatSeedPeerCount({})).toBe('0 / 0');
});

test('compareTorrents sorts strings, numbers, and queue priority', () => {
  const byName = FIXTURE.slice().sort((l, r) => compareTorrents(l, r, { key: 'name', direction: 'desc' }));
  expect(byName.map(t => t.name)).toEqual(['delta', 'charlie', 'bravo', 'alpha']);

  const bySpeed = FIXTURE.slice().sort((l, r) => compareTorrents(l, r, { key: 'dlspeed', direction: 'desc' }));
  expect(bySpeed[0].name).toBe('alpha');

  // Ascending queue sort: 1, 2, 3, then unqueued (priority 0) last.
  const byQueue = FIXTURE.slice().sort((l, r) => compareTorrents(l, r, { key: 'priority', direction: 'asc' }));
  expect(byQueue.map(t => t.name)).toEqual(['alpha', 'bravo', 'delta', 'charlie']);

  // Two unqueued torrents compare equal instead of NaN.
  expect(compareTorrents({ priority: 0 }, { priority: -1 }, { key: 'priority', direction: 'asc' })).toBe(0);
});

test('getTrackers normalizes entries and hides DHT/PeX/LSD rows for private torrents', () => {
  const meta = { trackers: [
    '** [DHT] **',
    { url: 'https://tracker.example/announce', status: 2, msg: '' },
  ] };
  const open = getTrackers({ private: false }, meta);
  expect(open.map(t => t.url)).toEqual(['** [DHT] **', 'https://tracker.example/announce']);

  const closed = getTrackers({ private: true }, meta);
  expect(closed.map(t => t.url)).toEqual(['https://tracker.example/announce']);

  // Falls back to the torrent's own trackers when meta has none.
  const fallback = getTrackers({ trackers: [{ url: 'udp://t.example' }] }, {});
  expect(fallback).toHaveLength(1);
});

test('tracker status helpers label and tone-code the qBittorrent codes', () => {
  expect(trackerStatusLabel({ status: 2 })).toBe('working');
  expect(trackerStatusLabel({ status: 4 })).toBe('not working');
  expect(trackerStatusLabel({})).toBe('tracker');
  expect(trackerStatusTone({ status: 2 })).toBe('ok');
  expect(trackerStatusTone({ status: 3 })).toBe('warn');
  expect(trackerStatusTone({ status: 4 })).toBe('error');
  expect(trackerStatusTone({ status: 0 })).toBe('muted');
  expect(formatTrackerCounts({ num_seeds: 5, num_peers: 2 })).toBe('seeds 5 / peers 2');
  expect(formatTrackerCounts({ num_seeds: -1 })).toBe('seeds ? / peers ?');
});

test('getPeers strips ports from addresses and reports an empty placeholder', () => {
  expect(getPeers({})).toEqual([['No peers reported', '--']]);
  const peers = getPeers({ peers: { '10.0.0.5:51413': { progress: 0.5 } } });
  expect(peers).toEqual([['10.0.0.5', '50%']]);
  const namedIp = getPeers({ peers: { 'key:1': { ip: '2001:db8::1', progress: 1 } } });
  expect(namedIp).toEqual([['2001:db8::1', '100%']]);
});

test('getFiles prefers meta files and falls back to the torrent itself', () => {
  expect(getFiles({ name: 'solo', size: 9 }, {})).toEqual([{ name: 'solo', size: 9 }]);
  expect(getFiles({}, { files: [{ name: 'a', size: 1 }] })).toEqual([{ name: 'a', size: 1 }]);
  // Tuple-shaped entries are tolerated.
  expect(getFiles({}, { files: [['b', 2]] })).toEqual([{ name: 'b', size: 2 }]);
});

test('getPreviewMeta exposes the sample torrent trackers and files', () => {
  expect(getPreviewMeta({ trackers: [1], files: [2] })).toEqual({ properties: {}, trackers: [1], files: [2], peers: {} });
  expect(getPreviewMeta({})).toEqual({ properties: {}, trackers: [], files: [], peers: {} });
});

test('getExternalAddress prefers v4, then v6, then unknown', () => {
  expect(getExternalAddress({ last_external_address_v4: '1.2.3.4', last_external_address_v6: '::1' })).toBe('1.2.3.4');
  expect(getExternalAddress({ last_external_address_v6: '::1' })).toBe('::1');
  expect(getExternalAddress({})).toBe('unknown');
});

test('isActive requires transfer in either direction', () => {
  expect(isActive({ dlspeed: 1, upspeed: 0 })).toBe(true);
  expect(isActive({ dlspeed: 0, upspeed: 1 })).toBe(true);
  expect(isActive({ dlspeed: 0, upspeed: 0 })).toBe(false);
  expect(isActive({})).toBe(false);
});
