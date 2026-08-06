import {
  buildTrackerUnion,
  compareApiVersions,
  createTorrentEditorDraft,
  editableTrackers,
  getChangedTorrentFields,
  getCommonTorrentFields,
  parseTrackerDraft,
  supportsTorrentComments,
  usesCurrentTrackerEditParameter,
} from './torrentEditor';

test('compares WebAPI versions numerically and gates changed capabilities', () => {
  expect(compareApiVersions('2.15.0', '2.9.9')).toBeGreaterThan(0);
  expect(compareApiVersions('2.13', '2.13.0')).toBe(0);
  expect(supportsTorrentComments('2.12.1')).toBe(true);
  expect(supportsTorrentComments('2.12.0')).toBe(false);
  expect(usesCurrentTrackerEditParameter('2.15.0')).toBe(true);
  expect(usesCurrentTrackerEditParameter('2.11.9')).toBe(false);
});

test('only exposes common fields and compares tag sets without ordering', () => {
  const fields = getCommonTorrentFields([
    { name: 'one', save_path: '/data', tags: 'linux, mirror', auto_tmm: false },
    { name: 'two', save_path: '/data', tags: 'mirror, linux', auto_tmm: true },
  ], '2.15.0');

  expect(fields.name.common).toBe(false);
  expect(fields.save_path).toEqual({ common: true, value: '/data' });
  expect(fields.tags.common).toBe(true);
  expect(fields.auto_tmm.common).toBe(false);
  expect(fields.comment).toBeUndefined();

  const draft = createTorrentEditorDraft(fields);
  expect(draft).toMatchObject({ save_path: '/data', tags: 'linux, mirror' });
  expect(draft).not.toHaveProperty('name');
  expect(getChangedTorrentFields(draft, { ...draft, save_path: '/archive' }))
    .toEqual({ save_path: '/archive' });
});

test('builds a tracker union with occurrence hashes and removes pseudo-trackers', () => {
  const torrents = [{ hash: 'one' }, { hash: 'two' }];
  const trackers = {
    one: [{ url: '** [DHT] **' }, { url: 'udp://shared' }, { url: 'udp://one' }],
    two: [{ url: '** [PeX] **' }, { url: 'udp://shared' }],
  };

  expect(editableTrackers(trackers.one)).toHaveLength(2);
  expect(buildTrackerUnion(torrents, trackers)).toEqual([
    { url: 'udp://one', hashes: ['one'] },
    { url: 'udp://shared', hashes: ['one', 'two'] },
  ]);
});

test('parses newline tracker input, trims it, and removes duplicates', () => {
  expect(parseTrackerDraft(' udp://one\n\nhttps://two\nudp://one '))
    .toEqual(['udp://one', 'https://two']);
});
