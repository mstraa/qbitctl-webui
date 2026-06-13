import { useEffect, useMemo, useState } from 'react';
import './App.css';
import AddTorrentModal from './components/AddTorrentModal';
import LoginPage from './components/LoginPage';
import RemoveTorrentModal from './components/RemoveTorrentModal';
import SelectedPanel from './components/SelectedPanel';
import SettingsPanel from './components/SettingsPanel';
import Sidebar from './components/Sidebar';
import TagEditor from './components/TagEditor';
import TorrentTable from './components/TorrentTable';
import VersionModal from './components/VersionModal';
import { createInitialSpeedHistory } from './components/SpeedHistoryGraph';
import { COLUMNS, DEFAULT_SETTINGS, GITHUB_REPO } from './lib/constants';
import { isNewerVersion } from './lib/format';
import { SAMPLE_TORRENTS } from './lib/sampleData';
import {
  APP_STATE_STORAGE_KEY,
  normalizeFilter,
  normalizeSort,
  normalizeTagFilters,
  pickUiSettings,
  readAppState,
  readStoredUiSettings,
  writeAppState,
} from './lib/storage';
import {
  compareTorrents,
  getExternalAddress,
  getPreviewMeta,
  isActive,
  matchesStateFilter,
  parseTags,
  searchableTorrentText,
} from './lib/torrents';

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
    // Placeholder shown outside live mode; only qBittorrent's own API ever
    // provides the real address (no third-party IP lookup).
    externalIp: 'xxx.xxx.xxx.xxx',
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
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [authNonce, setAuthNonce] = useState(0);

  const appVersion = import.meta.env.VITE_APP_VERSION || '0.0.0';
  const updateAvailable = latestRelease.checked && isNewerVersion(latestRelease.version, appVersion);

  const selectedTorrent = primaryHash
    ? torrents.find(torrent => torrent.hash === primaryHash)
    : null;

  useEffect(() => {
    let isMounted = true;

    async function loadTorrents() {
      try {
        const response = await fetch('/api/v2/torrents/info', { credentials: 'same-origin' });
        if (response.status === 401 || response.status === 403) {
          // qBittorrent requires authentication: show the login page rather
          // than falling back to preview data.
          if (isMounted) {
            enterAuthMode();
          }
          return;
        }
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
      } catch {
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
    // enterAuthMode only calls stable state setters, so it is safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryHash, authNonce]);

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

  // The GitHub release check is opt-in: while the version button is disabled
  // (the default) no request is made at all. When enabled it runs at most
  // once per page load; no periodic polling.
  useEffect(() => {
    if (!settings.ui_version_check_enabled || latestRelease.checked) {
      return;
    }
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
  }, [settings.ui_version_check_enabled, latestRelease.checked]);

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
        } catch {
          nextInfo.externalIp = 'unknown';
          nextInfo.freeSpace = null;
        }
      } else if (navigator.storage && navigator.storage.estimate) {
        try {
          const estimate = await navigator.storage.estimate();
          nextInfo.freeSpace = typeof estimate.quota === 'number' && typeof estimate.usage === 'number'
            ? estimate.quota - estimate.usage
            : null;
        } catch {
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
      const matchesFilter = matchesStateFilter(torrent, activeFilter);
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

  const showQueueColumn = settings.ui_show_queue_column !== false;
  const tableColumns = showQueueColumn
    ? COLUMNS
    : COLUMNS.filter(column => column.key !== 'priority');
  const maxQueuePriority = useMemo(
    () => torrents.reduce(
      (max, torrent) => (torrent.priority > 0 ? Math.max(max, torrent.priority) : max),
      0
    ),
    [torrents]
  );

  // Hiding the queue column would otherwise leave an invisible '#' sort with
  // no header indicator and no way to change it.
  useEffect(() => {
    if (!showQueueColumn && sort.key === 'priority') {
      setSort({ key: 'name', direction: 'asc' });
    }
  }, [showQueueColumn, sort.key]);

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

  // Rows are divs (the queue buttons cannot nest inside a button), so Enter
  // and Space reproduce the native button activation for keyboard users:
  // Enter fires on keydown, Space on keyup, like a real <button>. Alt+Arrow
  // moves the focused row in the queue (the chevrons are mouse-only tab-wise
  // so each row stays a single tab stop).
  function handleRowKeyDown(event, torrent) {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (showQueueColumn && event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      moveInQueue(torrent, event.key === 'ArrowUp' ? 'up' : 'down');
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      handleRowClick(event, torrent);
      return;
    }
    if (event.key === ' ' || event.key === 'Spacebar') {
      // Block page scroll now; activation happens on keyup.
      event.preventDefault();
    }
  }

  function handleRowKeyUp(event, torrent) {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      handleRowClick(event, torrent);
    }
  }

  function moveInQueue(torrent, direction) {
    const from = torrent.priority;
    if (!(from > 0)) {
      return;
    }
    if (direction === 'up' ? from <= 1 : from >= maxQueuePriority) {
      return;
    }
    if (status !== 'live') {
      flashPreviewAction();
      return;
    }
    const to = direction === 'up' ? from - 1 : from + 1;
    // Optimistic swap with the queue neighbour; the next poll confirms it.
    setTorrents(current => current.map(item => {
      if (item.hash === torrent.hash) {
        return { ...item, priority: to };
      }
      if (item.priority === to) {
        return { ...item, priority: from };
      }
      return item;
    }));
    postFirstAvailable(
      [direction === 'up' ? '/api/v2/torrents/increasePrio' : '/api/v2/torrents/decreasePrio'],
      new URLSearchParams({ hashes: torrent.hash })
    );
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
      flashPreviewAction();
      return;
    }

    const body = new URLSearchParams({ hashes: selectedActionHashes.join('|') });

    postFirstAvailable(actionMap[action], body);
  }

  // Briefly flag preview-mode actions. The timeout only downgrades the flash
  // itself, so a concurrent switch to another status (e.g. auth) sticks.
  function flashPreviewAction() {
    setStatus('preview action');
    window.setTimeout(() => {
      setStatus(current => (current === 'preview action' ? 'preview' : current));
    }, 1200);
  }

  function logIn(username, password) {
    if (loginBusy) {
      return;
    }
    setLoginBusy(true);
    setLoginError('');
    fetch('/api/v2/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username, password }),
    })
      .then(async response => {
        const text = (await response.text().catch(() => '')).trim();
        if (response.ok && text.toLowerCase().startsWith('ok')) {
          setStatus('connecting');
          setAuthNonce(nonce => nonce + 1);
          return;
        }
        if (response.status === 403) {
          // qBittorrent bans the IP after repeated failures and explains why.
          setLoginError(text || 'Too many failed attempts; qBittorrent banned this IP for a while.');
          return;
        }
        setLoginError('Invalid username or password.');
      })
      .catch(() => setLoginError('Could not reach the qBittorrent API.'))
      .finally(() => setLoginBusy(false));
  }

  function logOut() {
    fetch('/api/v2/auth/logout', { method: 'POST', credentials: 'same-origin' })
      .catch(() => {})
      .finally(() => enterAuthMode());
  }

  // Entered on explicit logout and on mid-session expiry (401/403 from the
  // poll): close every modal and drop session data so nothing stale
  // reappears after the next login.
  function enterAuthMode() {
    setSettingsOpen(false);
    closeAddModal();
    setRemoveOpen(false);
    setTagEditorOpen(false);
    setVersionModalOpen(false);
    clearSelection();
    setTorrents([]);
    setLoginError('');
    setStatus('auth');
  }

  function reannounceTorrent(hash) {
    if (!hash) {
      return;
    }
    if (status !== 'live') {
      flashPreviewAction();
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
      flashPreviewAction();
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

  if (status === 'auth') {
    return (
      <LoginPage
        accent={settings.ui_accent_color || '#f07b24'}
        busy={loginBusy}
        error={loginError}
        onLogin={logIn}
      />
    );
  }

  return (
    <div
      className={`terminal-shell ${showDetailsPanel ? '' : 'details-closed'} ${
        settings.ui_table_density === 'compact' ? 'compact-table' : ''
      } ${showQueueColumn ? 'queue-column' : ''}`}
      style={{ '--orange': settings.ui_accent_color || '#f07b24' }}
    >
      <Sidebar
        activeFilter={activeFilter}
        appVersion={appVersion}
        categories={categories}
        categoryFilter={categoryFilter}
        latestRelease={latestRelease}
        onCategoryFilter={setCategoryFilter}
        onFilter={setActiveFilter}
        onOpenVersion={() => setVersionModalOpen(true)}
        onResetTagFilters={() => setTagFilters([])}
        onToggleTag={toggleTagFilter}
        sessionInfo={sessionInfo}
        settings={settings}
        speedHistory={speedHistory}
        tagFilters={tagFilters}
        tags={tags}
        torrents={torrents}
        totals={totals}
        updateAvailable={updateAvailable}
      />

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

        <TorrentTable
          columns={tableColumns}
          maxQueuePriority={maxQueuePriority}
          onMoveInQueue={moveInQueue}
          onRowClick={handleRowClick}
          onRowKeyDown={handleRowKeyDown}
          onRowKeyUp={handleRowKeyUp}
          onSort={handleSort}
          selectedHashes={selectedHashes}
          showQueueColumn={showQueueColumn}
          showRatioProgress={Boolean(settings.ui_show_ratio_progress)}
          sort={sort}
          torrents={visibleTorrents}
        />
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
          onLogout={logOut}
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

export default App;
