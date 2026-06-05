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
  // Opt-in: while disabled (the default) no GitHub request is ever made.
  ui_version_check_enabled: false,
  ui_table_density: 'normal',
};

export const GITHUB_REPO = 'mstraa/qbitctl-webui';

export const COLUMNS = [
  { key: 'priority', label: '#' },
  { key: 'name', label: 'Name' },
  { key: 'state', label: 'Status' },
  { key: 'progress', label: 'Progress' },
  { key: 'dlspeed', label: 'Down' },
  { key: 'upspeed', label: 'Up' },
  { key: 'ratio', label: 'Ratio' },
  { key: 'added_on', label: 'Added' },
];
