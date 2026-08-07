import {
  matchingAutoTags,
  matchesAutoTagValue,
  normalizeAutoTagRules,
  trackerUrlsFrom,
} from './autoTags';

test('contains matching is literal and case-insensitive', () => {
  expect(matchesAutoTagValue('https://tracker.com/announce/abc', 'contains', 'TRACKER.COM')).toBe(true);
  expect(matchesAutoTagValue('trackerXcom', 'contains', 'tracker.com')).toBe(false);
});

test('like matching supports SQL wildcards and escapes regex characters', () => {
  expect(matchesAutoTagValue('Malcom.s11e09.hevc.mkv', 'like', '%S%E%')).toBe(true);
  expect(matchesAutoTagValue('show.S1xE2', 'like', '%S__E_')).toBe(true);
  expect(matchesAutoTagValue('release[4]', 'like', 'release[4]')).toBe(true);
  expect(matchesAutoTagValue('release4', 'like', 'release[4]')).toBe(false);
});

test('matching rules cover names and any tracker URL and deduplicate tags', () => {
  const rules = [
    { id: 'tracker', field: 'tracker_url', operator: 'contains', value: 'tracker.com', tag: 'Tracker' },
    { id: 'show', field: 'name', operator: 'like', value: '%S%E%', tag: 'tvshow' },
    { id: 'duplicate', field: 'name', operator: 'contains', value: 'Malcom', tag: 'TVSHOW' },
    { id: 'incomplete', field: 'name', operator: 'contains', value: '', tag: 'ignored' },
  ];
  expect(matchingAutoTags(
    { name: 'Malcom.s11e09.hevc.mkv' },
    rules,
    ['https://tracker.com/announce/cdjhfdkjshdjksfhd']
  )).toEqual(['Tracker', 'tvshow']);
});

test('normalization repairs stored rules and tracker extraction accepts API shapes', () => {
  expect(normalizeAutoTagRules(null)).toEqual([]);
  expect(normalizeAutoTagRules([{ field: 'bad', operator: 'bad', value: 3, tag: null }]))
    .toEqual([{ id: 'stored-auto-tag-0', field: 'name', operator: 'contains', value: '', tag: '' }]);
  expect(trackerUrlsFrom(
    { tracker: 'udp://current', trackers: [{ url: 'https://embedded' }] },
    ['udp://current', { url: 'https://reported' }, { msg: 'ignored' }]
  )).toEqual(['udp://current', 'https://embedded', 'https://reported']);
});
