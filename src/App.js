import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

const SAMPLE_TORRENTS = [
  {
    hash: 'linux-iso-stack',
    name: 'archlinux-2026.05.01-x86_64.iso',
    state: 'downloading',
    progress: 0.73,
    dlspeed: 11800000,
    upspeed: 1250000,
    size: 945000000,
    downloaded: 690000000,
    uploaded: 322000000,
    ratio: 0.47,
    eta: 22,
    num_seeds: 91,
    num_leechs: 14,
    category: 'linux',
    save_path: '/data/torrents/linux',
    tags: 'linux, mirror',
    added_on: 1779734520,
    completion_on: 0,
    trackers: [
      { url: 'udp://tracker.opentrackr.org:1337/announce', status: 2, msg: '', num_seeds: 91, num_peers: 14 },
      { url: 'https://torrent.ubuntu.com/announce', status: 2, msg: '', num_seeds: 64, num_peers: 9 },
      { url: 'https://ipv6.torrent.ubuntu.com/announce', status: 1, msg: '', num_seeds: 0, num_peers: 0 },
    ],
    files: [
      { name: 'archlinux-2026.05.01-x86_64.iso', size: 944786432, progress: 0.73 },
      { name: 'archlinux-bootstrap.sig', size: 566, progress: 1 },
    ],
  },
  {
    hash: 'media-nightly',
    name: 'nightly.build.assets.pack',
    state: 'stalledDL',
    progress: 0.38,
    dlspeed: 0,
    upspeed: 46000,
    size: 18400000000,
    downloaded: 6992000000,
    uploaded: 980000000,
    ratio: 0.14,
    eta: 8640000,
    num_seeds: 0,
    num_leechs: 6,
    category: 'work',
    save_path: '/data/torrents/work',
    tags: 'nightly, assets',
    added_on: 1779671220,
    completion_on: 0,
    trackers: [
      { url: 'udp://tracker.internal.local:6969/announce', status: 4, msg: 'Connection timed out', num_seeds: 0, num_peers: 0 },
      { url: 'http://opentracker.i2p.rocks:6969/announce', status: 1, msg: '', num_seeds: 0, num_peers: 0 },
    ],
    files: [
      { name: 'textures/base.pack', size: 6400000000, progress: 0.52 },
      { name: 'meshes/nightly.pack', size: 12000000000, progress: 0.31 },
    ],
  },
  {
    hash: 'doc-archive',
    name: 'public-domain-documentary-collection',
    state: 'uploading',
    progress: 1,
    dlspeed: 0,
    upspeed: 2820000,
    size: 12400000000,
    downloaded: 12400000000,
    uploaded: 48600000000,
    ratio: 3.92,
    eta: 8640000,
    num_seeds: 38,
    num_leechs: 3,
    category: 'media',
    save_path: '/data/torrents/media',
    tags: 'archive, public-domain',
    added_on: 1779458400,
    completion_on: 1779482100,
    trackers: [
      { url: 'udp://tracker.publicbt.com:80/announce', status: 4, msg: 'Torrent not registered with this tracker', num_seeds: 0, num_peers: 0 },
      { url: 'udp://tracker.opentrackr.org:1337/announce', status: 2, msg: '', num_seeds: 38, num_peers: 3 },
    ],
    files: [
      { name: 'documentary-collection/part-01.mkv', size: 6200000000, progress: 1 },
      { name: 'documentary-collection/part-02.mkv', size: 6200000000, progress: 1 },
    ],
  },
  {
    hash: 'paused-reference',
    name: 'reference-dataset-v14.tar.zst',
    state: 'pausedDL',
    progress: 0.11,
    dlspeed: 0,
    upspeed: 0,
    size: 78000000000,
    downloaded: 8580000000,
    uploaded: 12000000,
    ratio: 0,
    eta: 8640000,
    num_seeds: 12,
    num_leechs: 41,
    category: 'datasets',
    save_path: '/data/torrents/datasets',
    tags: 'reference, stopped',
    added_on: 1779300000,
    completion_on: 0,
    trackers: [
      { url: 'https://academictorrents.com/announce.php', status: 0, msg: '', num_seeds: 0, num_peers: 0 },
      { url: 'udp://tracker.storage.local:6969/announce', status: 0, msg: '', num_seeds: 0, num_peers: 0 },
    ],
    files: [
      { name: 'reference-dataset-v14.tar.zst', size: 78000000000, progress: 0.11 },
      { name: 'manifest.json', size: 112000, progress: 1 },
    ],
  },
];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'downloading', label: 'Downloading' },
  { key: 'seeding', label: 'Seeding' },
  { key: 'stopped', label: 'Stopped' },
  { key: 'stalled', label: 'Stalled' },
];

const DEFAULT_SETTINGS = {
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
  ui_show_version_button: true,
  ui_table_density: 'normal',
};

const APP_STATE_STORAGE_KEY = 'qbitctl.appState.v1';
const UI_SETTING_KEYS = [
  'ui_accent_color',
  'ui_show_category_filters',
  'ui_show_tag_filters',
  'ui_show_ratio_progress',
  'ui_show_version_button',
  'ui_table_density',
];

const GITHUB_REPO = 'mstraa/qbitctl-webui';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'state', label: 'Status' },
  { key: 'progress', label: 'Progress' },
  { key: 'dlspeed', label: 'Down' },
  { key: 'upspeed', label: 'Up' },
  { key: 'ratio', label: 'Ratio' },
  { key: 'added_on', label: 'Added' },
];

function App() {
  const [speedHistory, setSpeedHistory] = useState(createInitialSpeedHistory());
  const [torrents, setTorrents] = useState([]);
  const [selectedHashes, setSelectedHashes] = useState([]);
  const [primaryHash, setPrimaryHash] = useState('');
  const [lastClickedHash, setLastClickedHash] = useState('');
  const [activeFilter, setActiveFilter] = useState(() => normalizeFilter(readAppState().activeFilter));
  const [categoryFilter, setCategoryFilter] = useState(() => readAppState().categoryFilter || '');
  const [tagFilters, setTagFilters] = useState(() => normalizeTagFilters(readAppState()));
  const [query, setQuery] = useState(() => readAppState().query || '');
  const [sort, setSort] = useState(() => normalizeSort(readAppState().sort));
  const [status, setStatus] = useState('connecting');
  const [lastSync, setLastSync] = useState('');
  const [sessionInfo, setSessionInfo] = useState({
    externalIp: 'loading',
    freeSpace: null,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addMagnet, setAddMagnet] = useState('');
  const [addFiles, setAddFiles] = useState([]);
  const [addTags, setAddTags] = useState('');
  const [addStopped, setAddStopped] = useState(false);
  const [addNotice, setAddNotice] = useState('');
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeDeleteData, setRemoveDeleteData] = useState(false);
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...readStoredUiSettings(),
  }));
  const [notice, setNotice] = useState('');
  const [selectedMeta, setSelectedMeta] = useState({});
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [latestRelease, setLatestRelease] = useState({ version: '', notes: '', url: '', checked: false });
  const [qbtVersion, setQbtVersion] = useState('');

  const appVersion = process.env.REACT_APP_VERSION || '0.0.0';
  const updateAvailable = latestRelease.checked && isNewerVersion(latestRelease.version, appVersion);

  const selectedTorrent = primaryHash
    ? torrents.find(torrent => torrent.hash === primaryHash)
    : null;

  useEffect(() => {
    let isMounted = true;

    async function loadTorrents() {
      try {
        const response = await fetch('/api/v2/torrents/info', { credentials: 'same-origin' });
        if (!response.ok) {
          throw new Error('qBittorrent API unavailable');
        }
        const nextTorrents = await response.json();
        if (!isMounted) {
          return;
        }
        setTorrents(nextTorrents);
        setStatus('live');
        setLastSync(new Date().toLocaleTimeString());
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setTorrents(SAMPLE_TORRENTS);
        setStatus('preview');
        setLastSync(new Date().toLocaleTimeString());
      }
    }

    loadTorrents();
    const refresh = window.setInterval(loadTorrents, 5000);
    return () => {
      isMounted = false;
      window.clearInterval(refresh);
    };
  }, [primaryHash]);

  useEffect(() => {
    if (status !== 'live') {
      return;
    }
    fetch('/api/v2/app/preferences', { credentials: 'same-origin' })
      .then(response => (response.ok ? response.json() : {}))
      .then(preferences => setSettings(current => ({
        ...current,
        ...preferences,
        ...readStoredUiSettings(),
      })))
      .catch(() => {});
  }, [status]);

  useEffect(() => {
    writeAppState({
      activeFilter,
      categoryFilter,
      query,
      sort,
      // Drop the legacy single-tag key; JSON.stringify omits undefined values.
      tagFilter: undefined,
      tagFilters,
    });
  }, [activeFilter, categoryFilter, query, sort, tagFilters]);

  // Check the newest GitHub release once per page load; no periodic polling.
  useEffect(() => {
    let cancelled = false;
    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then(response => (response.ok ? response.json() : null))
      .then(release => {
        if (cancelled || !release || !release.tag_name) {
          return;
        }
        setLatestRelease({
          version: String(release.tag_name).replace(/^v/, ''),
          notes: release.body || '',
          url: release.html_url || `https://github.com/${GITHUB_REPO}/releases`,
          checked: true,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'live' || qbtVersion) {
      return;
    }
    let cancelled = false;
    fetch('/api/v2/app/version', { credentials: 'same-origin' })
      .then(response => (response.ok ? response.text() : ''))
      .then(version => {
        if (!cancelled && version) {
          setQbtVersion(version);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status, qbtVersion]);

  useEffect(() => {
    writeAppState({
      settings: pickUiSettings(settings),
    });
  }, [settings]);

  useEffect(() => {
    function syncStoredState(event) {
      if (event.key !== APP_STATE_STORAGE_KEY) {
        return;
      }
      const nextState = readAppState();
      setActiveFilter(normalizeFilter(nextState.activeFilter));
      setCategoryFilter(nextState.categoryFilter || '');
      setTagFilters(normalizeTagFilters(nextState));
      setQuery(nextState.query || '');
      setSort(normalizeSort(nextState.sort));
      setSettings(current => ({
        ...current,
        ...pickUiSettings(nextState.settings || {}),
      }));
    }

    window.addEventListener('storage', syncStoredState);
    return () => window.removeEventListener('storage', syncStoredState);
  }, []);

  useEffect(() => {
    if (status === 'live') {
      return;
    }

    let cancelled = false;

    async function loadExternalIp() {
      try {
        const response = await fetch(`https://api.ipify.org?format=json&_=${Date.now()}`, {
          cache: 'no-store',
        });
        if (response.ok) {
          const payload = await response.json();
          if (!cancelled) {
            setSessionInfo(current => ({
              ...current,
              externalIp: payload.ip || 'unknown',
            }));
          }
        }
      } catch (error) {
        if (!cancelled) {
          setSessionInfo(current => ({
            ...current,
            externalIp: 'unknown',
          }));
        }
      }
    }

    loadExternalIp();
    const refresh = window.setInterval(loadExternalIp, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, [status]);

  useEffect(() => {
    let cancelled = false;

    async function loadSessionInfo() {
      const nextInfo = {};

      if (status === 'live') {
        try {
          const response = await fetch('/api/v2/sync/maindata', { credentials: 'same-origin' });
          if (response.ok) {
            const payload = await response.json();
            const serverState = payload.server_state || {};
            nextInfo.externalIp = getExternalAddress(serverState);
            nextInfo.freeSpace = typeof serverState.free_space_on_disk === 'number'
              ? serverState.free_space_on_disk
              : null;
          }
        } catch (error) {
          nextInfo.externalIp = 'unknown';
          nextInfo.freeSpace = null;
        }
      } else if (navigator.storage && navigator.storage.estimate) {
        try {
          const estimate = await navigator.storage.estimate();
          nextInfo.freeSpace = typeof estimate.quota === 'number' && typeof estimate.usage === 'number'
            ? estimate.quota - estimate.usage
            : null;
        } catch (error) {
          nextInfo.freeSpace = null;
        }
      }

      if (!cancelled) {
        setSessionInfo(current => ({
          ...current,
          ...nextInfo,
        }));
      }
    }

    loadSessionInfo();
    const refresh = window.setInterval(loadSessionInfo, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, [status]);

  useEffect(() => {
    if (!selectedTorrent) {
      setSelectedMeta({});
      return;
    }
    if (status !== 'live') {
      setSelectedMeta(getPreviewMeta(selectedTorrent));
      return;
    }
    let cancelled = false;
    const hash = encodeURIComponent(selectedTorrent.hash);
    Promise.all([
      fetch(`/api/v2/torrents/properties?hash=${hash}`, { credentials: 'same-origin' })
        .then(response => (response.ok ? response.json() : {}))
        .catch(() => ({})),
      fetch(`/api/v2/torrents/trackers?hash=${hash}`, { credentials: 'same-origin' })
        .then(response => (response.ok ? response.json() : []))
        .catch(() => []),
      fetch(`/api/v2/torrents/files?hash=${hash}`, { credentials: 'same-origin' })
        .then(response => (response.ok ? response.json() : []))
        .catch(() => []),
      fetch(`/api/v2/sync/torrentPeers?hash=${hash}&rid=0`, { credentials: 'same-origin' })
        .then(response => (response.ok ? response.json() : {}))
        .catch(() => ({})),
    ]).then(([properties, trackers, files, peers]) => {
      if (!cancelled) {
        setSelectedMeta({
          properties,
          trackers,
          files,
          peers: peers.peers || {},
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedTorrent, status]);

  const tags = useMemo(() => {
    const found = new Set();
    torrents.forEach(torrent => parseTags(torrent.tags).forEach(tag => found.add(tag)));
    return Array.from(found).sort((a, b) => a.localeCompare(b));
  }, [torrents]);

  const categories = useMemo(() => {
    const found = new Set();
    torrents.forEach(torrent => {
      if (torrent.category) {
        found.add(torrent.category);
      }
    });
    return Array.from(found).sort((a, b) => a.localeCompare(b));
  }, [torrents]);

  const filteredTorrents = useMemo(() => {
    return torrents.filter(torrent => {
      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'active' && isActive(torrent)) ||
        (activeFilter === 'downloading' && isDownloading(torrent.state)) ||
        (activeFilter === 'seeding' && isSeeding(torrent.state)) ||
        (activeFilter === 'stopped' && isStopped(torrent.state)) ||
        (activeFilter === 'stalled' && isStalled(torrent.state));
      const matchesCategory = settings.ui_show_category_filters === false ||
        !categoryFilter ||
        torrent.category === categoryFilter;
      const torrentTags = parseTags(torrent.tags);
      const matchesTag = settings.ui_show_tag_filters === false ||
        !tagFilters.length ||
        tagFilters.every(tag => torrentTags.includes(tag));
      const matchesQuery = searchableTorrentText(torrent).includes(query.trim().toLowerCase());
      return matchesFilter && matchesCategory && matchesTag && matchesQuery;
    });
  }, [activeFilter, categoryFilter, query, settings.ui_show_category_filters, settings.ui_show_tag_filters, tagFilters, torrents]);

  const visibleTorrents = useMemo(() => {
    const next = filteredTorrents.slice();
    next.sort((left, right) => compareTorrents(left, right, sort));
    return next;
  }, [filteredTorrents, sort]);

  const totals = useMemo(() => {
    return torrents.reduce(
      (accumulator, torrent) => ({
        dlspeed: accumulator.dlspeed + torrent.dlspeed,
        upspeed: accumulator.upspeed + torrent.upspeed,
        size: accumulator.size + torrent.size,
        downloaded: accumulator.downloaded + (torrent.downloaded || 0),
        uploaded: accumulator.uploaded + (torrent.uploaded || 0),
        active: accumulator.active + (isActive(torrent) ? 1 : 0),
      }),
      { dlspeed: 0, upspeed: 0, size: 0, downloaded: 0, uploaded: 0, active: 0 }
    );
  }, [torrents]);

  useEffect(() => {
    if (!torrents.length) {
      return;
    }
    setSpeedHistory(current => {
      const next = current.concat({
        down: totals.dlspeed,
        time: Date.now(),
        up: totals.upspeed,
      });
      return next.slice(-60);
    });
  }, [lastSync, torrents.length, totals.dlspeed, totals.upspeed]);

  const selectedCount = selectedHashes.length;
  const selectedActionHashes = selectedHashes.length ? selectedHashes : primaryHash ? [primaryHash] : [];

  function handleSort(key) {
    setSort(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  function handleRowClick(event, torrent) {
    const hash = torrent.hash;
    const modifier = event.metaKey || event.ctrlKey;

    if (event.shiftKey && lastClickedHash) {
      const start = visibleTorrents.findIndex(item => item.hash === lastClickedHash);
      const end = visibleTorrents.findIndex(item => item.hash === hash);
      if (start !== -1 && end !== -1) {
        const range = visibleTorrents
          .slice(Math.min(start, end), Math.max(start, end) + 1)
          .map(item => item.hash);
        setSelectedHashes(current => Array.from(new Set(current.concat(range))));
      }
    } else if (modifier) {
      setSelectedHashes(current => {
        const next = current.includes(hash)
          ? current.filter(item => item !== hash)
          : current.concat(hash);
        return next;
      });
    } else {
      setSelectedHashes([hash]);
    }

    setPrimaryHash(hash);
    setLastClickedHash(hash);
  }

  function clearSelection() {
    setSelectedHashes([]);
    setPrimaryHash('');
  }

  function toggleTagFilter(tag) {
    setTagFilters(current =>
      current.includes(tag)
        ? current.filter(item => item !== tag)
        : current.concat(tag)
    );
  }

  function handleAction(action) {
    if (!selectedActionHashes.length) {
      return;
    }
    if (action === 'delete') {
      setRemoveDeleteData(false);
      setRemoveOpen(true);
      return;
    }

    const actionMap = {
      resume: ['/api/v2/torrents/start', '/api/v2/torrents/resume'],
      stop: ['/api/v2/torrents/stop', '/api/v2/torrents/pause'],
      recheck: ['/api/v2/torrents/recheck'],
    };

    if (status !== 'live') {
      setStatus('preview action');
      window.setTimeout(() => setStatus('preview'), 1200);
      return;
    }

    const body = new URLSearchParams({ hashes: selectedActionHashes.join('|') });

    postFirstAvailable(actionMap[action], body);
  }

  function reannounceTorrent(hash) {
    if (!hash) {
      return;
    }
    if (status !== 'live') {
      setStatus('preview action');
      window.setTimeout(() => setStatus('preview'), 1200);
      return;
    }
    postFirstAvailable(['/api/v2/torrents/reannounce'], new URLSearchParams({ hashes: hash }));
  }

  function postFirstAvailable(urls, body) {
    const [url, ...fallbacks] = urls;

    fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }).then(response => {
      if (!response.ok && fallbacks.length) {
        postFirstAvailable(fallbacks, body);
      }
    }).catch(() => {
      if (fallbacks.length) {
        postFirstAvailable(fallbacks, body);
      }
    });
  }

  function confirmRemove() {
    if (!selectedActionHashes.length) {
      setRemoveOpen(false);
      return;
    }

    if (status !== 'live') {
      setStatus('preview action');
      window.setTimeout(() => setStatus('preview'), 1200);
      setRemoveOpen(false);
      return;
    }

    fetch('/api/v2/torrents/delete', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        deleteFiles: String(removeDeleteData),
        hashes: selectedActionHashes.join('|'),
      }),
    }).then(() => {
      clearSelection();
      setRemoveOpen(false);
      setRemoveDeleteData(false);
    });
  }

  function openAddModal() {
    setAddNotice('');
    setAddOpen(true);
  }

  function closeAddModal() {
    setAddOpen(false);
    setAddMagnet('');
    setAddFiles([]);
    setAddTags('');
    setAddStopped(false);
    setAddNotice('');
  }

  function addTorrent() {
    const urls = addMagnet.trim();
    if (!urls && !addFiles.length) {
      setAddNotice('Paste a magnet/URL or choose .torrent files.');
      return;
    }

    if (status !== 'live') {
      setAddNotice('Preview mode: torrent add is not sent to qBittorrent.');
      return;
    }

    const body = new FormData();
    if (urls) {
      body.append('urls', urls);
    }
    addFiles.forEach(file => body.append('torrents', file, file.name));
    if (addStopped) {
      body.append('stopped', 'true');
      body.append('paused', 'true');
    }
    const tagList = parseTags(addTags);
    if (tagList.length) {
      body.append('tags', tagList.join(','));
    }

    fetch('/api/v2/torrents/add', {
      method: 'POST',
      credentials: 'same-origin',
      body,
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('add failed');
        }
        closeAddModal();
        setLastSync(new Date().toLocaleTimeString());
      })
      .catch(() => setAddNotice('qBittorrent rejected the add request.'));
  }

  function updateSetting(key, value) {
    setSettings(current => ({ ...current, [key]: value }));
  }

  function saveSettings() {
    if (status !== 'live') {
      setNotice('Preview mode: settings are shown but not written to qBittorrent.');
      return;
    }
    fetch('/api/v2/app/setPreferences', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ json: JSON.stringify(settings) }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('settings save failed');
        }
        setNotice('Settings saved to qBittorrent.');
      })
      .catch(() => setNotice('qBittorrent rejected the settings update.'));
  }

  function revertWebUI() {
    if (status !== 'live') {
      updateSetting('alternative_webui_enabled', false);
      setNotice('Preview mode: disable Alternative WebUI in qBittorrent to revert.');
      return;
    }
    fetch('/api/v2/app/setPreferences', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ json: JSON.stringify({ alternative_webui_enabled: false }) }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('revert failed');
        }
        updateSetting('alternative_webui_enabled', false);
        setNotice('Alternative WebUI disabled. Reload qBittorrent to use the default UI.');
      })
      .catch(() => setNotice('Could not disable Alternative WebUI from here.'));
  }

  function openTagEditor() {
    if (!selectedTorrent) {
      return;
    }
    setTagDraft(parseTags(selectedTorrent.tags).join(', '));
    setTagEditorOpen(true);
  }

  function saveTags() {
    if (!selectedTorrent) {
      return;
    }
    const oldTags = parseTags(selectedTorrent.tags);
    const nextTags = parseTags(tagDraft);
    setTorrents(current =>
      current.map(torrent =>
        selectedHashes.includes(torrent.hash)
          ? { ...torrent, tags: nextTags.join(', ') }
          : torrent
      )
    );
    setTagEditorOpen(false);

    if (status === 'live') {
      const hashes = selectedActionHashes.join('|');
      const toRemove = oldTags.filter(tag => !nextTags.includes(tag));
      const toAdd = nextTags.filter(tag => !oldTags.includes(tag));
      if (toRemove.length) {
        fetch('/api/v2/torrents/removeTags', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ hashes, tags: toRemove.join(',') }),
        });
      }
      if (toAdd.length) {
        fetch('/api/v2/torrents/createTags', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ tags: toAdd.join(',') }),
        });
        fetch('/api/v2/torrents/addTags', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ hashes, tags: toAdd.join(',') }),
        });
      }
    }
  }

  const showDetailsPanel = Boolean(selectedTorrent);

  return (
    <div
      className={`terminal-shell ${showDetailsPanel ? '' : 'details-closed'} ${
        settings.ui_table_density === 'compact' ? 'compact-table' : ''
      }`}
      style={{ '--orange': settings.ui_accent_color || '#f07b24' }}
    >
      <aside className="sidebar">
        <div className="brand">
          <span className="prompt-mark">qb</span>
          <div>
            <h1>qbitctl</h1>
            <p>p2p lover's dashboard</p>
          </div>
        </div>

        {settings.ui_show_version_button !== false && (
          <button
            className={`version-button ${updateAvailable ? 'update-available' : ''}`}
            onClick={() => setVersionModalOpen(true)}
            title={updateAvailable ? `Update available: v${latestRelease.version}` : 'Version details'}
            type="button"
          >
            <span>v{appVersion}</span>
            {updateAvailable && <strong>⇡ v{latestRelease.version}</strong>}
          </button>
        )}

        <nav className="filter-list" aria-label="Torrent filters">
          {FILTERS.map(filter => (
            <button
              className={filter.key === activeFilter ? 'active' : ''}
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              type="button"
            >
              <span>{filter.label}</span>
              <strong>{countForFilter(torrents, filter.key)}</strong>
            </button>
          ))}
        </nav>

        {settings.ui_show_category_filters && categories.length > 0 && (
          <nav className="filter-list side-filter" aria-label="Category filters">
            <span className="sidebar-label">categories</span>
            <button
              className={!categoryFilter ? 'active' : ''}
              onClick={() => setCategoryFilter('')}
              type="button"
            >
              <span>All categories</span>
              <strong>{torrents.length}</strong>
            </button>
            {categories.map(category => (
              <button
                className={category === categoryFilter ? 'active' : ''}
                key={category}
                onClick={() => setCategoryFilter(category)}
                type="button"
              >
                <span>{category}</span>
                <strong>{torrents.filter(torrent => torrent.category === category).length}</strong>
              </button>
            ))}
          </nav>
        )}

        {settings.ui_show_tag_filters && tags.length > 0 && (
          <nav className="filter-list tags-filter" aria-label="Tag filters">
            <span className="sidebar-label">tags</span>
            <button
              className={!tagFilters.length ? 'active' : ''}
              onClick={() => setTagFilters([])}
              type="button"
            >
              <span>All tags</span>
              <strong>{torrents.length}</strong>
            </button>
            {tags.map(tag => (
              <button
                className={tagFilters.includes(tag) ? 'active' : ''}
                key={tag}
                onClick={() => toggleTagFilter(tag)}
                type="button"
              >
                <span>{tag}</span>
                <strong>{torrents.filter(torrent => parseTags(torrent.tags).includes(tag)).length}</strong>
              </button>
            ))}
          </nav>
        )}

        <div className="sidebar-bottom">
          <SpeedHistoryGraph history={speedHistory} />
          <div className="stats-panel">
            <dl>
              <div>
                <dt>up</dt>
                <dd><SpeedValue bytes={totals.upspeed} /></dd>
                <small>{formatBytes(totals.uploaded)}</small>
              </div>
              <div>
                <dt>down</dt>
                <dd><SpeedValue bytes={totals.dlspeed} /></dd>
                <small>{formatBytes(totals.downloaded)}</small>
              </div>
            </dl>
            <div className="session-lines">
              <span>IP</span>
              <strong>{sessionInfo.externalIp || 'unknown'}</strong>
              <span>Free</span>
              <strong>{sessionInfo.freeSpace == null ? 'unknown' : formatBytes(sessionInfo.freeSpace)}</strong>
            </div>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">/api/v2/torrents/info</span>
            <h2>Torrents</h2>
          </div>
          <div className="toolbar" aria-label="Torrent actions">
            <button className="add-button" onClick={openAddModal} type="button">ADD</button>
            <button onClick={() => handleAction('resume')} type="button">Resume</button>
            <button onClick={() => handleAction('stop')} type="button">Stop</button>
            <button onClick={() => handleAction('recheck')} type="button">Recheck</button>
            <button className="danger" onClick={() => handleAction('delete')} type="button">Remove</button>
            <button
              aria-label="Settings"
              className="settings-trigger icon-settings"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              type="button"
            >
              ⚙
            </button>
          </div>
        </header>

        <section className="command-row">
          <label htmlFor="torrent-search">grep</label>
          <input
            id="torrent-search"
            onChange={event => setQuery(event.target.value)}
            placeholder="filter by name, hash, category, tag"
            type="search"
            value={query}
          />
          <span>{selectedCount ? `${selectedCount} selected` : `synced ${lastSync || '--:--:--'}`}</span>
        </section>

        <section className="torrent-table" aria-label="Torrent list">
          <div className="table-head">
            {COLUMNS.map(column => (
              <button key={column.key} onClick={() => handleSort(column.key)} type="button">
                <span>{column.label}</span>
                <strong>{sort.key === column.key ? sort.direction : ''}</strong>
              </button>
            ))}
          </div>

          {visibleTorrents.map(torrent => {
            const selected = selectedHashes.includes(torrent.hash);
            return (
              <button
                className={`torrent-row ${selected ? 'selected' : ''}`}
                key={torrent.hash}
                onClick={event => handleRowClick(event, torrent)}
                type="button"
              >
                <span className="torrent-name">
                  <strong>{torrent.name}</strong>
                  <small>{formatNameMeta(torrent)}</small>
                </span>
                <span><StatusBadge torrent={torrent} /></span>
                <span className="progress-cell">
                  <ProgressBar value={torrent.progress} />
                  <small>{Math.round(torrent.progress * 100)}%</small>
                  {settings.ui_show_ratio_progress && torrent.ratio > 0 && (
                    <span className="ratio-progress" style={{ width: `${Math.min(torrent.ratio, 1) * 100}%` }} />
                  )}
                </span>
                <span>{formatSpeed(torrent.dlspeed)}</span>
                <span>{formatSpeed(torrent.upspeed)}</span>
                <span>{formatRatio(torrent.ratio)}</span>
                <span>{formatDateShort(torrent.added_on)}</span>
              </button>
            );
          })}

          {!visibleTorrents.length && <div className="empty-state">No torrents match this filter.</div>}
        </section>
      </main>

      {showDetailsPanel && (
        <aside className="details-pane">
          {selectedTorrent ? (
            <SelectedPanel
              meta={selectedMeta}
              onClose={clearSelection}
              onEditTags={openTagEditor}
              onReannounce={() => reannounceTorrent(selectedTorrent.hash)}
              selectedCount={selectedCount}
              torrent={selectedTorrent}
            />
          ) : null}
        </aside>
      )}

      {settingsOpen && (
        <SettingsPanel
          notice={notice}
          onClose={() => setSettingsOpen(false)}
          onRevert={revertWebUI}
          onSave={saveSettings}
          onUpdate={updateSetting}
          settings={settings}
          status={status}
        />
      )}

      {addOpen && (
        <AddTorrentModal
          allTags={tags}
          files={addFiles}
          magnet={addMagnet}
          notice={addNotice}
          onClose={closeAddModal}
          onFiles={setAddFiles}
          onMagnet={setAddMagnet}
          onStopped={setAddStopped}
          onSubmit={addTorrent}
          onTags={setAddTags}
          status={status}
          stopped={addStopped}
          tags={addTags}
        />
      )}

      {removeOpen && (
        <RemoveTorrentModal
          deleteData={removeDeleteData}
          onClose={() => setRemoveOpen(false)}
          onConfirm={confirmRemove}
          onDeleteData={setRemoveDeleteData}
          selectedCount={selectedActionHashes.length}
        />
      )}

      {tagEditorOpen && (
        <TagEditor
          allTags={tags}
          draft={tagDraft}
          onClose={() => setTagEditorOpen(false)}
          onSave={saveTags}
          onUpdate={setTagDraft}
          selectedCount={selectedCount}
        />
      )}

      {versionModalOpen && (
        <VersionModal
          currentVersion={appVersion}
          latestRelease={latestRelease}
          onClose={() => setVersionModalOpen(false)}
          qbtVersion={qbtVersion}
          updateAvailable={updateAvailable}
        />
      )}
    </div>
  );
}

function overlayClose(event, onClose) {
  if (event.target === event.currentTarget) {
    onClose();
  }
}

function VersionModal({ currentVersion, latestRelease, onClose, qbtVersion, updateAvailable }) {
  return (
    <div className="settings-overlay tag-overlay" onClick={event => overlayClose(event, onClose)} role="dialog" aria-modal="true" aria-labelledby="version-title">
      <section className="tag-modal version-modal">
        <header className="settings-head">
          <div>
            <span className="eyebrow">github.com/{GITHUB_REPO}</span>
            <h2 id="version-title">Version</h2>
          </div>
          <button className="icon-close" onClick={onClose} type="button">x</button>
        </header>
        <div className="settings-body">
          <ul className="detail-list version-list">
            <li>
              <span>WebUI version</span>
              <strong>v{currentVersion}</strong>
            </li>
            <li>
              <span>Latest release</span>
              <strong>{latestRelease.checked ? `v${latestRelease.version}` : 'unknown'}</strong>
            </li>
            <li>
              <span>qBittorrent</span>
              <strong>{qbtVersion || 'unknown'}</strong>
            </li>
          </ul>
          <section className="changelog" aria-label="Release changelog">
            <h3>{latestRelease.checked ? `Changelog v${latestRelease.version}` : 'Changelog'}</h3>
            <pre>{latestRelease.notes || 'No release notes available.'}</pre>
          </section>
          {latestRelease.url && (
            <a className="release-link" href={latestRelease.url} rel="noopener noreferrer" target="_blank">
              Open release on GitHub
            </a>
          )}
        </div>
        <footer className="settings-footer">
          <span>
            {!latestRelease.checked
              ? 'Could not reach GitHub to check for updates.'
              : updateAvailable
                ? `Update available: v${latestRelease.version}`
                : 'You are on the latest version.'}
          </span>
          <div>
            <button onClick={onClose} type="button">Close</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function RemoveTorrentModal({ deleteData, onClose, onConfirm, onDeleteData, selectedCount }) {
  return (
    <div className="settings-overlay tag-overlay" onClick={event => overlayClose(event, onClose)} role="dialog" aria-modal="true" aria-labelledby="remove-title">
      <section className="tag-modal remove-modal">
        <header className="settings-head">
          <div>
            <span className="eyebrow">{selectedCount} selected</span>
            <h2 id="remove-title">Remove torrents</h2>
          </div>
          <button className="icon-close" onClick={onClose} type="button">x</button>
        </header>
        <div className="settings-body">
          <p className="settings-hint">
            This removes {selectedCount === 1 ? 'the selected torrent' : 'the selected torrents'} from qBittorrent.
          </p>
          <label className="setting-row wide danger-row">
            <span>Delete downloaded data</span>
            <input checked={deleteData} onChange={event => onDeleteData(event.target.checked)} type="checkbox" />
          </label>
          <p className="settings-hint">Data deletion is off by default.</p>
        </div>
        <footer className="settings-footer">
          <span>{deleteData ? 'Torrent data files will be deleted.' : 'Torrent data files will be kept.'}</span>
          <div>
            <button onClick={onClose} type="button">Cancel</button>
            <button className="danger-confirm" onClick={onConfirm} type="button">Remove</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function AddTorrentModal({ allTags, files, magnet, notice, onClose, onFiles, onMagnet, onStopped, onSubmit, onTags, status, stopped, tags }) {
  const draftTags = parseTags(tags);

  function toggleTag(tag) {
    const nextTags = draftTags.includes(tag)
      ? draftTags.filter(item => item !== tag)
      : draftTags.concat(tag);
    onTags(nextTags.join(', '));
  }

  return (
    <div className="settings-overlay tag-overlay" onClick={event => overlayClose(event, onClose)} role="dialog" aria-modal="true" aria-labelledby="add-title">
      <section className="tag-modal add-modal">
        <header className="settings-head">
          <div>
            <span className="eyebrow">/api/v2/torrents/add</span>
            <h2 id="add-title">Add torrents</h2>
          </div>
          <button className="icon-close" onClick={onClose} type="button">x</button>
        </header>
        <div className="settings-body">
          <label className="setting-row wide add-file-row">
            <span>Torrent files</span>
            <input
              accept=".torrent,application/x-bittorrent"
              multiple
              onChange={event => onFiles(event.target.files ? Array.from(event.target.files) : [])}
              type="file"
            />
            <strong>
              {files.length
                ? `${files.length} file${files.length === 1 ? '' : 's'}: ${files.map(file => file.name).join(', ')}`
                : 'no files selected'}
            </strong>
          </label>
          <label className="setting-row wide add-text-row">
            <span>Magnet or URL</span>
            <textarea
              onChange={event => onMagnet(event.target.value)}
              placeholder="magnet:?xt=urn:btih:... (one per line)"
              rows="5"
              value={magnet}
            />
          </label>
          <label className="setting-row wide">
            <span>Tags</span>
            <input
              onChange={event => onTags(event.target.value)}
              placeholder="comma-separated tags"
              type="text"
              value={tags}
            />
          </label>
          {allTags.length > 0 && (
            <section className="quick-tags" aria-label="Existing tags">
              <span>Quick add / remove</span>
              <div>
                {allTags.map(tag => (
                  <button
                    className={draftTags.includes(tag) ? 'active' : ''}
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    type="button"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </section>
          )}
          <label className="setting-row wide">
            <span>Add stopped</span>
            <input checked={stopped} onChange={event => onStopped(event.target.checked)} type="checkbox" />
          </label>
          <p className="settings-hint">
            Current mode: {status}. Enable Add stopped when importing your own data, then recheck it before resuming.
          </p>
        </div>
        <footer className="settings-footer">
          <span>{notice || 'Ready to add to qBittorrent.'}</span>
          <div>
            <button onClick={onClose} type="button">Cancel</button>
            <button className="save-settings" onClick={onSubmit} type="button">Add</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function StatusBadge({ torrent }) {
  return <span className={`status-badge ${statusTone(torrent)}`}>{formatStatus(torrent)}</span>;
}

function ProgressBar({ value, large }) {
  return (
    <span className={`progress-track ${large ? 'large' : ''}`}>
      <span style={{ width: `${Math.round(value * 100)}%` }} />
    </span>
  );
}

function SpeedValue({ bytes }) {
  const [value, unit = 'B'] = formatBytes(bytes).split(' ');
  return (
    <span className="speed-value">
      <span>{value}</span>
      <small>{unit}/s</small>
    </span>
  );
}

function SpeedHistoryGraph({ history }) {
  const dataMax = Math.max(
    0,
    ...history.map(point => Math.max(point.down || 0, point.up || 0))
  );
  const max = Math.max(1, dataMax);
  const downPath = buildLinePath(history.map(point => point.down || 0), max);
  const upPath = buildLinePath(history.map(point => point.up || 0), max);

  return (
    <section className="speed-history" aria-label="Last hour speed graph">
      <header>
        <span>Activity</span>
      </header>
      <div className="speed-plot">
        <svg viewBox="0 0 100 38" preserveAspectRatio="none" role="img">
          {/* Grid lines sit at max (y=2), max/2 (y=18), and 0 (y=34) to match the axis labels. */}
          <path className="grid-line" d="M0 2 H100 M0 18 H100 M0 34 H100" />
          <path className="up-line" d={upPath} />
          <path className="down-line" d={downPath} />
        </svg>
        <div className="speed-axis" aria-hidden="true">
          <span style={{ top: `${(2 / 38) * 100}%` }}>{dataMax ? formatAxisSpeed(dataMax) : '--'}</span>
          <span style={{ top: `${(18 / 38) * 100}%` }}>{dataMax ? formatAxisSpeed(dataMax / 2) : '--'}</span>
          <span style={{ top: `${(34 / 38) * 100}%` }}>0</span>
        </div>
      </div>
      <div className="speed-legend">
        <span><i className="legend-up" />up</span>
        <span><i className="legend-down" />down</span>
      </div>
    </section>
  );
}

function SelectedPanel({ meta, onClose, onEditTags, onReannounce, selectedCount, torrent }) {
  return (
    <>
      <div className="details-heading">
        <div>
          <span className="eyebrow">{selectedCount > 1 ? `${selectedCount} selected` : 'selected'}</span>
          <h2>{torrent.name}</h2>
        </div>
        <button className="details-close" onClick={onClose} type="button">x</button>
      </div>
      <ProgressBar value={torrent.progress} large />

      <dl className="details-grid">
        <Detail label="State" value={formatStatus(torrent)} />
        <Detail label="Downloaded" value={formatBytes(torrent.downloaded)} />
        <Detail label="Total size" value={formatBytes(torrent.size)} />
        <Detail label="Uploaded" value={formatBytes(torrent.uploaded)} />
        <Detail label="Ratio" value={formatRatio(torrent.ratio)} />
        <Detail label="Seeds / Peers" value={formatSeedPeerCount(torrent)} />
        <Detail label="Down speed" value={formatSpeed(torrent.dlspeed)} />
        <Detail label="Up speed" value={formatSpeed(torrent.upspeed)} />
        <Detail label="ETA" value={formatEta(torrent.eta)} />
        <Detail label="Added" value={formatTimestamp(torrent.added_on)} />
        <Detail label="Completed" value={formatTimestamp(torrent.completion_on)} />
        <Detail label="Category" value={torrent.category || 'none'} />
      </dl>

      <div className="path-box">
        <span>save_path</span>
        <code>{torrent.save_path || 'unknown'}</code>
      </div>

      <button className="tags-edit-box" onClick={onEditTags} type="button">
        <span>tags</span>
        <code>{parseTags(torrent.tags).join(', ') || 'add tags'}</code>
      </button>

      <TrackersSection
        key={torrent.hash}
        onReannounce={onReannounce}
        trackers={getTrackers(torrent, meta)}
      />
      <DetailList title="Peers" items={getPeers(meta)} />
      <DetailList title="Files" items={getFiles(torrent, meta).map(file => [file.name, formatBytes(file.size)])} />
    </>
  );
}

function TrackersSection({ onReannounce, trackers }) {
  const [expandedUrl, setExpandedUrl] = useState('');

  return (
    <section className="detail-section">
      <header className="detail-section-head">
        <h3>Trackers</h3>
        <button className="detail-action" onClick={onReannounce} title="Force reannounce to all trackers" type="button">
          Reannounce
        </button>
      </header>
      <ul className="detail-list tracker-list">
        {!trackers.length && (
          <li className="tracker-empty">
            <span>No trackers reported</span>
            <strong>--</strong>
          </li>
        )}
        {trackers.map(tracker => {
          const expanded = tracker.url === expandedUrl;
          const tone = trackerStatusTone(tracker);
          return (
            <li className={expanded ? 'expanded' : ''} key={tracker.url}>
              <button
                aria-expanded={expanded}
                className="tracker-row"
                onClick={() => setExpandedUrl(expanded ? '' : tracker.url)}
                type="button"
              >
                <span>{tracker.url}</span>
                <strong className={`tracker-status ${tone}`}>{trackerStatusLabel(tracker)}</strong>
              </button>
              {expanded && (
                <div className="tracker-detail">
                  <p className={`tracker-response ${tone}`}>
                    {tracker.msg || 'No response message from this tracker.'}
                  </p>
                  <div className="tracker-detail-foot">
                    <span>{formatTrackerCounts(tracker)}</span>
                    <button className="detail-action" onClick={onReannounce} type="button">
                      Force reannounce
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function DetailList({ items, title }) {
  return (
    <section className="detail-section">
      <h3>{title}</h3>
      <ul className="detail-list">
        {items.map(([label, value]) => (
          <li key={`${title}-${label}`}>
            <span>{label}</span>
            <strong>{value}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TagEditor({ allTags, draft, onClose, onSave, onUpdate, selectedCount }) {
  const draftTags = parseTags(draft);

  function toggleTag(tag) {
    const nextTags = draftTags.includes(tag)
      ? draftTags.filter(item => item !== tag)
      : draftTags.concat(tag);
    onUpdate(nextTags.join(', '));
  }

  return (
    <div className="settings-overlay tag-overlay" onClick={event => overlayClose(event, onClose)} role="dialog" aria-modal="true" aria-labelledby="tag-title">
      <section className="tag-modal">
        <header className="settings-head">
          <div>
            <span className="eyebrow">{selectedCount} selected</span>
            <h2 id="tag-title">Edit tags</h2>
          </div>
          <button className="icon-close" onClick={onClose} type="button">x</button>
        </header>
        <div className="settings-body">
          <label className="setting-row wide">
            <span>Comma-separated tags</span>
            <input value={draft} onChange={event => onUpdate(event.target.value)} type="text" />
          </label>
          {allTags.length > 0 && (
            <section className="quick-tags" aria-label="Existing tags">
              <span>Quick add / remove</span>
              <div>
                {allTags.map(tag => (
                  <button
                    className={draftTags.includes(tag) ? 'active' : ''}
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    type="button"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </section>
          )}
          <p className="settings-hint">Add, edit, remove, or create tags here. In qBittorrent mode this uses the tag APIs.</p>
        </div>
        <footer className="settings-footer">
          <span>Tags apply to the current selection.</span>
          <div>
            <button onClick={onClose} type="button">Cancel</button>
            <button className="save-settings" onClick={onSave} type="button">Save tags</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function SettingsPanel({ notice, onClose, onRevert, onSave, onUpdate, settings, status }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advancedSettings = Object.entries(settings).sort(([left], [right]) => left.localeCompare(right));
  return (
    <div className="settings-overlay" onClick={event => overlayClose(event, onClose)} role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <section className="settings-panel">
        <header className="settings-head">
          <div>
            <span className="eyebrow">/api/v2/app/preferences</span>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button className="icon-close" onClick={onClose} type="button">x</button>
        </header>
        <div className="settings-body">
          <section className="settings-section critical">
            <div>
              <h3>WebUI</h3>
              <p>Revert disables qBittorrent&apos;s Alternative WebUI and returns the app to the default qBittorrent interface after reload.</p>
            </div>
            <label className="setting-row">
              <span>Alternative WebUI</span>
              <input checked={Boolean(settings.alternative_webui_enabled)} onChange={event => onUpdate('alternative_webui_enabled', event.target.checked)} type="checkbox" />
            </label>
            <label className="setting-row wide">
              <span>WebUI path</span>
              <input onChange={event => onUpdate('alternative_webui_path', event.target.value)} type="text" value={settings.alternative_webui_path || ''} />
            </label>
            <button className="revert-button" onClick={onRevert} type="button">Revert to default qBittorrent WebUI</button>
            <p className="settings-hint">Manual fallback: qBittorrent Settings - Web UI - uncheck "Use alternative WebUI", then apply and reload.</p>
          </section>

          <section className="settings-section">
            <h3>Interface</h3>
            <label className="setting-row">
              <span>Color hint</span>
              <input onChange={event => onUpdate('ui_accent_color', event.target.value)} type="color" value={settings.ui_accent_color || '#f07b24'} />
            </label>
            <label className="setting-row">
              <span>Ratio progress bar</span>
              <input checked={Boolean(settings.ui_show_ratio_progress)} onChange={event => onUpdate('ui_show_ratio_progress', event.target.checked)} type="checkbox" />
            </label>
            <label className="setting-row">
              <span>Category filters</span>
              <input checked={settings.ui_show_category_filters !== false} onChange={event => onUpdate('ui_show_category_filters', event.target.checked)} type="checkbox" />
            </label>
            <label className="setting-row">
              <span>Tag filters</span>
              <input checked={settings.ui_show_tag_filters !== false} onChange={event => onUpdate('ui_show_tag_filters', event.target.checked)} type="checkbox" />
            </label>
            <label className="setting-row">
              <span>Version button</span>
              <input checked={settings.ui_show_version_button !== false} onChange={event => onUpdate('ui_show_version_button', event.target.checked)} type="checkbox" />
            </label>
            <label className="setting-row wide">
              <span>Table density</span>
              <select onChange={event => onUpdate('ui_table_density', event.target.value)} value={settings.ui_table_density || 'normal'}>
                <option value="normal">normal</option>
                <option value="compact">compact</option>
              </select>
            </label>
          </section>

          <section className="settings-section">
            <h3>Access</h3>
            <label className="setting-row"><span>Web UI port</span><input onChange={event => onUpdate('web_ui_port', event.target.value)} type="number" value={settings.web_ui_port || ''} /></label>
            <label className="setting-row"><span>Bypass auth for localhost</span><input checked={Boolean(settings.bypass_local_auth)} onChange={event => onUpdate('bypass_local_auth', event.target.checked)} type="checkbox" /></label>
          </section>

          <section className="settings-section">
            <h3>Speed limits</h3>
            <label className="setting-row"><span>Download limit B/s</span><input onChange={event => onUpdate('dl_limit', event.target.value)} type="number" value={settings.dl_limit || 0} /></label>
            <label className="setting-row"><span>Upload limit B/s</span><input onChange={event => onUpdate('up_limit', event.target.value)} type="number" value={settings.up_limit || 0} /></label>
          </section>

          <section className="settings-section">
            <h3>Queueing</h3>
            <label className="setting-row"><span>Enable queueing</span><input checked={Boolean(settings.queueing_enabled)} onChange={event => onUpdate('queueing_enabled', event.target.checked)} type="checkbox" /></label>
            <label className="setting-row"><span>Max active downloads</span><input onChange={event => onUpdate('max_active_downloads', event.target.value)} type="number" value={settings.max_active_downloads || 0} /></label>
            <label className="setting-row"><span>Max active uploads</span><input onChange={event => onUpdate('max_active_uploads', event.target.value)} type="number" value={settings.max_active_uploads || 0} /></label>
            <label className="setting-row"><span>Max active torrents</span><input onChange={event => onUpdate('max_active_torrents', event.target.value)} type="number" value={settings.max_active_torrents || 0} /></label>
          </section>

          <section className="settings-section">
            <h3>Downloads</h3>
            <label className="setting-row wide"><span>Default save path</span><input onChange={event => onUpdate('save_path', event.target.value)} type="text" value={settings.save_path || ''} /></label>
            <label className="setting-row"><span>Use incomplete path</span><input checked={Boolean(settings.temp_path_enabled)} onChange={event => onUpdate('temp_path_enabled', event.target.checked)} type="checkbox" /></label>
            <label className="setting-row wide"><span>Incomplete path</span><input onChange={event => onUpdate('temp_path', event.target.value)} type="text" value={settings.temp_path || ''} /></label>
            <h3>External program</h3>
            <label className="setting-row wide"><span>Run on torrent completion</span><input checked={Boolean(settings.autorun_enabled)} onChange={event => onUpdate('autorun_enabled', event.target.checked)} type="checkbox" /></label>
            <label className="setting-row wide"><span>Command on completion</span><textarea onChange={event => onUpdate('autorun_program', event.target.value)} rows="4" value={settings.autorun_program || ''} /></label>
            <label className="setting-row wide"><span>Run on torrent added</span><input checked={Boolean(settings.autorun_on_torrent_added_enabled)} onChange={event => onUpdate('autorun_on_torrent_added_enabled', event.target.checked)} type="checkbox" /></label>
            <label className="setting-row wide"><span>Command on added</span><textarea onChange={event => onUpdate('autorun_on_torrent_added_program', event.target.value)} rows="4" value={settings.autorun_on_torrent_added_program || ''} /></label>
          </section>

          <section className="settings-section advanced-section">
            <button className="advanced-toggle" onClick={() => setAdvancedOpen(open => !open)} type="button">
              <span>Advanced: all qBittorrent settings</span>
              <strong>{advancedOpen ? 'hide' : `show ${advancedSettings.length}`}</strong>
            </button>
            <p className="settings-hint">Current mode: {status}. Live mode reads and writes qBittorrent preferences.</p>
            {advancedOpen && (
              <div className="advanced-grid">
                {advancedSettings.map(([key, value]) => (
                  <label className="advanced-row" key={key}>
                    <span>{key}</span>
                    <SettingValueInput name={key} onUpdate={onUpdate} value={value} />
                  </label>
                ))}
              </div>
            )}
          </section>
        </div>
        <footer className="settings-footer">
          <span>{notice || 'Settings are staged locally until saved.'}</span>
          <div>
            <button onClick={onClose} type="button">Close</button>
            <button className="save-settings" onClick={onSave} type="button">Save settings</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function SettingValueInput({ name, onUpdate, value }) {
  if (typeof value === 'boolean') {
    return <input checked={value} onChange={event => onUpdate(name, event.target.checked)} type="checkbox" />;
  }
  if (typeof value === 'number') {
    return <input onChange={event => onUpdate(name, Number(event.target.value))} type="number" value={Number.isFinite(value) ? value : 0} />;
  }
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    return <textarea onChange={event => onUpdate(name, event.target.value)} rows="3" value={JSON.stringify(value, null, 2)} />;
  }
  return <input onChange={event => onUpdate(name, event.target.value)} type="text" value={value == null ? '' : String(value)} />;
}

function countForFilter(torrents, filter) {
  if (filter === 'all') {
    return torrents.length;
  }
  return torrents.filter(torrent => {
    if (filter === 'active') return isActive(torrent);
    if (filter === 'downloading') return isDownloading(torrent.state);
    if (filter === 'seeding') return isSeeding(torrent.state);
    if (filter === 'stopped') return isStopped(torrent.state);
    if (filter === 'stalled') return isStalled(torrent.state);
    return false;
  }).length;
}

function compareTorrents(left, right, sort) {
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
  return torrent[key] || 0;
}

function readAppState() {
  try {
    const raw = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function writeAppState(partialState) {
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

function readStoredUiSettings() {
  return pickUiSettings(readAppState().settings || {});
}

function pickUiSettings(settings) {
  return UI_SETTING_KEYS.reduce((accumulator, key) => {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      accumulator[key] = settings[key];
    }
    return accumulator;
  }, {});
}

function normalizeSort(candidate) {
  const fallback = { key: 'name', direction: 'asc' };
  if (!candidate || typeof candidate !== 'object') {
    return fallback;
  }
  const columnExists = COLUMNS.some(column => column.key === candidate.key);
  const direction = candidate.direction === 'desc' ? 'desc' : 'asc';
  return columnExists ? { key: candidate.key, direction } : fallback;
}

function isNewerVersion(candidate, current) {
  if (!candidate || !current) {
    return false;
  }
  const a = String(candidate).split('.').map(Number);
  const b = String(current).split('.').map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const left = Number.isFinite(a[index]) ? a[index] : 0;
    const right = Number.isFinite(b[index]) ? b[index] : 0;
    if (left > right) return true;
    if (left < right) return false;
  }
  return false;
}

function normalizeFilter(candidate) {
  // The standalone paused filter was folded into stopped.
  if (candidate === 'paused') {
    return 'stopped';
  }
  return FILTERS.some(filter => filter.key === candidate) ? candidate : 'all';
}

function normalizeTagFilters(state) {
  if (Array.isArray(state.tagFilters)) {
    return state.tagFilters.filter(tag => typeof tag === 'string' && tag);
  }
  // Migrate the legacy single-tag filter key.
  if (typeof state.tagFilter === 'string' && state.tagFilter) {
    return [state.tagFilter];
  }
  return [];
}

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

function isActive(torrent) {
  return (torrent.dlspeed || 0) > 0 || (torrent.upspeed || 0) > 0;
}

function statusTone(torrent) {
  if (isStopped(torrent.state)) return 'muted';
  if (isStalled(torrent.state)) return 'warning';
  if (isDownloading(torrent.state)) return 'active';
  if (isSeeding(torrent.state)) return 'seeding';
  return 'muted';
}

function formatStatus(torrentOrState) {
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

function parseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter(Boolean);
  return String(tags).split(',').map(tag => tag.trim()).filter(Boolean);
}

function formatNameMeta(torrent) {
  return [torrent.category, parseTags(torrent.tags).join(', ')].filter(Boolean).join(' | ');
}

function searchableTorrentText(torrent) {
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

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function formatRatio(ratio) {
  return Number(ratio || 0).toFixed(2);
}

function formatSpeed(bytes) {
  return `${formatBytes(bytes)}/s`;
}

// Compact byte/s label for the activity graph axis, e.g. "11M" or "450K".
function formatAxisSpeed(bytes) {
  if (!bytes || bytes < 1) {
    return '0';
  }
  const units = ['B', 'K', 'M', 'G', 'T'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)}${units[exponent]}`;
}

// qBittorrent reports 8640000 seconds (100 days) when the ETA is unknown/infinite.
const ETA_INFINITY = 8640000;

function formatEta(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0 || value >= ETA_INFINITY) {
    return '∞';
  }
  const days = Math.floor(value / 86400);
  const hours = Math.floor((value % 86400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = Math.floor(value % 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function formatSeedPeerCount(torrent) {
  const seeds = Number.isFinite(torrent.num_complete)
    ? torrent.num_complete
    : torrent.num_seeds;
  const peers = Number.isFinite(torrent.num_incomplete)
    ? torrent.num_incomplete
    : torrent.num_leechs;
  return `${seeds || 0} / ${peers || 0}`;
}

function formatDateShort(seconds) {
  if (!seconds) return '--';
  return new Date(seconds * 1000).toLocaleDateString();
}

function formatTimestamp(seconds) {
  if (!seconds) return '--';
  return new Date(seconds * 1000).toLocaleString();
}

function getPreviewMeta(torrent) {
  return { properties: {}, trackers: torrent.trackers || [], files: torrent.files || [], peers: {} };
}

function getTrackers(torrent, meta) {
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

function trackerStatusLabel(tracker) {
  const labels = {
    0: 'disabled',
    1: 'not contacted',
    2: 'working',
    3: 'updating',
    4: 'not working',
  };
  return labels[tracker.status] || 'tracker';
}

function trackerStatusTone(tracker) {
  if (tracker.status === 2) return 'ok';
  if (tracker.status === 3) return 'warn';
  if (tracker.status === 4) return 'error';
  return 'muted';
}

function formatTrackerCounts(tracker) {
  const seeds = Number.isFinite(tracker.num_seeds) && tracker.num_seeds >= 0 ? tracker.num_seeds : '?';
  const peers = Number.isFinite(tracker.num_peers) && tracker.num_peers >= 0 ? tracker.num_peers : '?';
  return `seeds ${seeds} / peers ${peers}`;
}

function getPeers(meta) {
  const peers = Object.entries(meta.peers || {}).map(([address, peer]) => {
    const ip = peer.ip || address.split(':').slice(0, -1).join(':') || address;
    return [ip, formatPercent(peer.progress)];
  });
  return peers.length ? peers : [['No peers reported', '--']];
}

function getFiles(torrent, meta) {
  const files = meta.files && meta.files.length ? meta.files : torrent.files;
  if (files && files.length) {
    return files.map(file => ({
      name: file.name || file[0] || 'unknown',
      size: file.size || file[1] || 0,
    }));
  }
  return [{ name: torrent.name, size: torrent.size }];
}

function getExternalAddress(serverState) {
  return serverState.last_external_address_v4 ||
    serverState.last_external_address_v6 ||
    'unknown';
}

function createInitialSpeedHistory() {
  return Array.from({ length: 60 }, (_, index) => {
    return {
      down: 0,
      time: Date.now() - (59 - index) * 60000,
      up: 0,
    };
  });
}

function buildLinePath(values, max) {
  if (!values.length) {
    return '';
  }
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 36 - (Math.min(value / max, 1) * 32 + 2);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export default App;
