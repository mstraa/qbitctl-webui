import {
  APP_STATE_STORAGE_KEY,
  normalizeFilter,
  normalizeSort,
  normalizeTagFilters,
  pickUiSettings,
  readAppState,
  readStoredUiSettings,
  writeAppState,
} from './storage';

beforeEach(() => {
  window.localStorage.clear();
});

test('readAppState returns an empty object for missing or corrupt storage', () => {
  expect(readAppState()).toEqual({});
  window.localStorage.setItem(APP_STATE_STORAGE_KEY, 'not json{');
  expect(readAppState()).toEqual({});
});

test('writeAppState merges partial state and drops undefined keys', () => {
  writeAppState({ activeFilter: 'seeding' });
  writeAppState({ query: 'iso', tagFilter: undefined });
  expect(readAppState()).toEqual({ activeFilter: 'seeding', query: 'iso' });
  expect(readAppState()).not.toHaveProperty('tagFilter');
});

test('pickUiSettings keeps only the ui_* keys this app owns', () => {
  const picked = pickUiSettings({
    ui_accent_color: '#fff',
    ui_show_queue_column: false,
    ui_table_density: 'compact',
    save_path: '/data',
    queueing_enabled: true,
  });
  expect(picked).toEqual({
    ui_accent_color: '#fff',
    ui_show_queue_column: false,
    ui_table_density: 'compact',
  });
});

test('readStoredUiSettings reads the settings slice of stored state', () => {
  expect(readStoredUiSettings()).toEqual({});
  writeAppState({ settings: { ui_accent_color: '#abc', dl_limit: '9' } });
  expect(readStoredUiSettings()).toEqual({ ui_accent_color: '#abc' });
});

test('normalizeSort falls back to name/asc for unknown columns', () => {
  expect(normalizeSort(undefined)).toEqual({ key: 'name', direction: 'asc' });
  expect(normalizeSort('garbage')).toEqual({ key: 'name', direction: 'asc' });
  expect(normalizeSort({ key: 'bogus', direction: 'desc' })).toEqual({ key: 'name', direction: 'asc' });
  expect(normalizeSort({ key: 'priority', direction: 'desc' })).toEqual({ key: 'priority', direction: 'desc' });
  expect(normalizeSort({ key: 'ratio', direction: 'sideways' })).toEqual({ key: 'ratio', direction: 'asc' });
});

test('normalizeFilter migrates the legacy paused filter and rejects unknowns', () => {
  expect(normalizeFilter('paused')).toBe('stopped');
  expect(normalizeFilter('seeding')).toBe('seeding');
  expect(normalizeFilter('bogus')).toBe('all');
  expect(normalizeFilter(undefined)).toBe('all');
});

test('normalizeTagFilters accepts arrays, migrates the legacy single tag, and drops junk', () => {
  expect(normalizeTagFilters({ tagFilters: ['a', '', 3, 'b'] })).toEqual(['a', 'b']);
  expect(normalizeTagFilters({ tagFilter: 'linux' })).toEqual(['linux']);
  expect(normalizeTagFilters({ tagFilters: ['x'], tagFilter: 'ignored' })).toEqual(['x']);
  expect(normalizeTagFilters({})).toEqual([]);
});
