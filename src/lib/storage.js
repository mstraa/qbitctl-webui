import { COLUMNS, FILTERS } from './constants';

export const APP_STATE_STORAGE_KEY = 'qbitctl.appState.v1';

const UI_SETTING_KEYS = [
  'ui_accent_color',
  'ui_show_category_filters',
  'ui_show_tag_filters',
  'ui_show_ratio_progress',
  'ui_show_queue_column',
  'ui_version_check_enabled',
  'ui_table_density',
];

export function readAppState() {
  try {
    const raw = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

export function writeAppState(partialState) {
  try {
    const current = readAppState();
    window.localStorage.setItem(APP_STATE_STORAGE_KEY, JSON.stringify({
      ...current,
      ...partialState,
    }));
  } catch (error) {
    // Persistence is best-effort; the UI should keep working without storage.
  }
}

export function readStoredUiSettings() {
  return pickUiSettings(readAppState().settings || {});
}

export function pickUiSettings(settings) {
  return UI_SETTING_KEYS.reduce((accumulator, key) => {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      accumulator[key] = settings[key];
    }
    return accumulator;
  }, {});
}

export function normalizeSort(candidate) {
  const fallback = { key: 'name', direction: 'asc' };
  if (!candidate || typeof candidate !== 'object') {
    return fallback;
  }
  const columnExists = COLUMNS.some(column => column.key === candidate.key);
  const direction = candidate.direction === 'desc' ? 'desc' : 'asc';
  return columnExists ? { key: candidate.key, direction } : fallback;
}

export function normalizeFilter(candidate) {
  // The standalone paused filter was folded into stopped.
  if (candidate === 'paused') {
    return 'stopped';
  }
  return FILTERS.some(filter => filter.key === candidate) ? candidate : 'all';
}

export function normalizeTagFilters(state) {
  if (Array.isArray(state.tagFilters)) {
    return state.tagFilters.filter(tag => typeof tag === 'string' && tag);
  }
  // Migrate the legacy single-tag filter key.
  if (typeof state.tagFilter === 'string' && state.tagFilter) {
    return [state.tagFilter];
  }
  return [];
}
