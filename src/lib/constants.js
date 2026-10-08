export const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'downloading', label: 'Downloading' },
  { key: 'seeding', label: 'Seeding' },
  { key: 'stopped', label: 'Stopped' },
  { key: 'stalled', label: 'Stalled' },
];

export const DEFAULT_SETTINGS = {
  alternative_webui_enabled: true,
  alternative_webui_path: 'build/public',
  web_ui_port: '8080',
  bypass_local_auth: false,
  dht: true,
  pex: true,
  lsd: true,
  queueing_enabled: true,
  max_active_downloads: '3',
  max_active_uploads: '3',
  max_active_torrents: '8',
  dl_limit: '0',
  up_limit: '0',
  save_path: '/data/torrents',
  temp_path_enabled: false,
  temp_path: '/data/incomplete',
  ui_accent_color: '#f07b24',
  ui_show_category_filters: true,
  ui_show_tag_filters: true,
  ui_show_ratio_progress: true,
  ui_show_queue_column: true,
  ui_show_size_column: false,
  ui_show_seeds_column: false,
  // Opt-in: while disabled (the default) no GitHub request is ever made.
  ui_version_check_enabled: false,
  ui_table_density: 'normal',
};

export const GITHUB_REPO = 'mstraa/qbitctl-webui';

// `width` is the grid track; `minWidth` is its share of the table's minimum
// width. Ratio has no column of its own: it sits under the progress percentage
// and stays sortable from the Progress header.
export const COLUMNS = [
  { key: 'priority', label: '#', width: '74px', minWidth: 74 },
  { key: 'name', label: 'Name', width: 'minmax(260px, 1.9fr)', minWidth: 260 },
  { key: 'state', label: 'Status', width: '140px', minWidth: 140 },
  { key: 'size', label: 'Size', width: '80px', minWidth: 80 },
  {
    key: 'progress',
    label: 'Progress',
    secondary: { key: 'ratio', label: 'Ratio' },
    width: 'minmax(170px, 1fr)',
    minWidth: 170,
  },
  { key: 'dlspeed', label: 'Down', width: '90px', minWidth: 90 },
  { key: 'upspeed', label: 'Up', width: '90px', minWidth: 90 },
  { key: 'seeds', label: 'Seeds / Peers', width: '110px', minWidth: 110 },
  { key: 'added_on', label: 'Added', width: '80px', minWidth: 80 },
];

export function columnSortKeys(columns) {
  return columns.flatMap(column => (column.secondary ? [column.key, column.secondary.key] : [column.key]));
}
