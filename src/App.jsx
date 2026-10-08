import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import AddTorrentModal from './components/AddTorrentModal';
import DisconnectedPage from './components/DisconnectedPage';
import LoginPage from './components/LoginPage';
import RemoveTorrentModal from './components/RemoveTorrentModal';
import SelectedPanel from './components/SelectedPanel';
import SettingsPanel from './components/SettingsPanel';
import Sidebar from './components/Sidebar';
import TagEditor from './components/TagEditor';
import TorrentTable from './components/TorrentTable';
import TorrentEditor from './components/TorrentEditor';
import VersionModal from './components/VersionModal';
import { createInitialSpeedHistory } from './components/SpeedHistoryGraph';
import { COLUMNS, DEFAULT_SETTINGS, GITHUB_REPO, columnSortKeys } from './lib/constants';
import { isNewerVersion } from './lib/format';
import {
  AUTO_TAG_CONCURRENCY,
  autoTagRulesSignature,
  autoTagTorrentId,
  isAutoTagMetadataPending,
  matchingAutoTags,
  realTrackerUrls,
  trackerUrlsFrom,
} from './lib/autoTags';
import { SAMPLE_TORRENTS } from './lib/sampleData';
import {
  APP_STATE_STORAGE_KEY,
  normalizeExcludedCategories,
  normalizeExcludedTagFilters,
  normalizeFilter,
  normalizeSort,
  normalizeTagFilters,
  pickUiSettings,
  readAppState,
  readStoredAutoTagCompletion,
  readStoredAutoTagRules,
  readStoredUiSettings,
  writeAppState,
} from './lib/storage';
import {
  compareApiVersions,
  editableTrackers,
  getChangedTorrentFields,
  usesCurrentTrackerEditParameter,
} from './lib/torrentEditor';
import {
  compareTorrents,
  getExternalAddress,
  getPreviewMeta,
  isActive,
  matchesStateFilter,
  parseTags,
  searchableTorrentText,
} from './lib/torrents';

// qBittorrent 5 renamed pause/resume to stop/start; the second URL keeps 4.x working.
const TORRENT_ACTION_URLS = {
  resume: ['/api/v2/torrents/start', '/api/v2/torrents/resume'],
  stop: ['/api/v2/torrents/stop', '/api/v2/torrents/pause'],
  recheck: ['/api/v2/torrents/recheck'],
};

async function postForm(url, values) {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: values instanceof URLSearchParams ? values : new URLSearchParams(values),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).trim();
    throw new Error(detail || `qBittorrent returned HTTP ${response.status}`);
  }
  return response;
}

function App() {
  const [speedHistory, setSpeedHistory] = useState(createInitialSpeedHistory());
  const [torrents, setTorrents] = useState([]);
  const [selectedHashes, setSelectedHashes] = useState([]);
  const [primaryHash, setPrimaryHash] = useState('');
  const [lastClickedHash, setLastClickedHash] = useState('');
  const [activeFilter, setActiveFilter] = useState(() => normalizeFilter(readAppState().activeFilter));
  const [categoryFilter, setCategoryFilter] = useState(() => readAppState().categoryFilter || '');
  const [excludedCategories, setExcludedCategories] = useState(() => normalizeExcludedCategories(readAppState()));
  const [tagFilters, setTagFilters] = useState(() => normalizeTagFilters(readAppState()));
  const [excludedTagFilters, setExcludedTagFilters] = useState(() => normalizeExcludedTagFilters(readAppState()));
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
  const [autoTagRules, setAutoTagRules] = useState(readStoredAutoTagRules);
  const autoTagCompletion = useRef(readStoredAutoTagCompletion());
  const autoTagQueue = useRef(new Map());
  const autoTagProcessing = useRef(new Set());
  const autoTagRetry = useRef(new Map());
  const autoTagPersistTimer = useRef(null);
  const autoTagMounted = useRef(true);
  const [notice, setNotice] = useState('');
  const [selectedMeta, setSelectedMeta] = useState({});
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [torrentEditorOpen, setTorrentEditorOpen] = useState(false);
  const [torrentEditorTrackers, setTorrentEditorTrackers] = useState({});
  const [torrentEditorLoading, setTorrentEditorLoading] = useState(false);
  const [torrentEditorBusy, setTorrentEditorBusy] = useState(false);
  const [torrentEditorTrackerBusy, setTorrentEditorTrackerBusy] = useState('');
  const [torrentEditorNotice, setTorrentEditorNotice] = useState(null);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [latestRelease, setLatestRelease] = useState({ version: '', notes: '', url: '', checked: false });
  const [qbtVersion, setQbtVersion] = useState('');
  const [webApiVersion, setWebApiVersion] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [authNonce, setAuthNonce] = useState(0);

  const appVersion = import.meta.env.VITE_APP_VERSION || '0.0.0';
  const updateAvailable = latestRelease.checked && isNewerVersion(latestRelease.version, appVersion);
  const autoTagSignature = useMemo(() => autoTagRulesSignature(autoTagRules), [autoTagRules]);
  const autoTagRulesRef = useRef(autoTagRules);
  const autoTagSignatureRef = useRef(autoTagSignature);
  autoTagRulesRef.current = autoTagRules;
  autoTagSignatureRef.current = autoTagSignature;

  function persistAutoTagCompletion() {
    const completion = autoTagCompletion.current;
    writeAppState({
      autoTagCompletion: {
        signature: completion.signature,
        torrentIds: completion.torrentIds,
      },
    });
  }

  function scheduleAutoTagCompletionSave() {
    if (autoTagPersistTimer.current) {
      window.clearTimeout(autoTagPersistTimer.current);
    }
    autoTagPersistTimer.current = window.setTimeout(() => {
      autoTagPersistTimer.current = null;
      persistAutoTagCompletion();
    }, 250);
  }

  function markAutoTagCompleted(torrentId, signature) {
    const completion = autoTagCompletion.current;
    if (signature !== autoTagSignatureRef.current || completion.signature !== signature) {
      return;
    }
    autoTagRetry.current.delete(torrentId);
    if (!completion.torrentIds.includes(torrentId)) {
      completion.torrentIds.push(torrentId);
      scheduleAutoTagCompletionSave();
    }
  }

  function scheduleAutoTagRetry(torrentId, error) {
    const previous = autoTagRetry.current.get(torrentId);
    const attempts = (previous?.attempts || 0) + 1;
    const delay = Math.min(60_000, 5_000 * (2 ** Math.min(attempts - 1, 4)));
    autoTagRetry.current.set(torrentId, {
      attempts,
      nextAttempt: Date.now() + delay,
    });
    if (error) {
      console.warn(`Auto-tag attempt ${attempts} failed; retrying.`, error);
    }
  }

  function mergeAutoTagsIntoTorrent(torrentId, addedTags, signature) {
    if (!addedTags.length || !autoTagMounted.current || signature !== autoTagSignatureRef.current) {
      return;
    }
    setTorrents(current => current.map(torrent => {
      if (autoTagTorrentId(torrent) !== torrentId) {
        return torrent;
      }
      const tags = parseTags(torrent.tags);
      const known = new Set(tags.map(tag => tag.toLowerCase()));
      addedTags.forEach(tag => {
        if (!known.has(tag.toLowerCase())) {
          tags.push(tag);
          known.add(tag.toLowerCase());
        }
      });
      return { ...torrent, tags: tags.join(', ') };
    }));
  }

  async function assignMissingAutoTags(torrent, desiredTags, knownTags, signature) {
    if (signature !== autoTagSignatureRef.current) {
      return [];
    }
    const known = new Set(knownTags.map(tag => tag.toLowerCase()));
    const missing = desiredTags.filter(tag => !known.has(tag.toLowerCase()));
    if (!missing.length) {
      return [];
    }
    const tags = missing.join(',');
    await postForm('/api/v2/torrents/createTags', { tags });
    if (signature !== autoTagSignatureRef.current) {
      return [];
    }
    await postForm('/api/v2/torrents/addTags', { hashes: torrent.hash, tags });
    return missing;
  }

  async function reconcileAutoTagTorrent(torrent, rules, signature) {
    if (signature !== autoTagSignatureRef.current || isAutoTagMetadataPending(torrent)) {
      return { completed: false, addedTags: [] };
    }

    const nameRules = rules.filter(rule => rule.field === 'name');
    const trackerRules = rules.filter(rule => rule.field === 'tracker_url');
    const knownTags = parseTags(torrent.tags);
    const nameTags = matchingAutoTags(torrent, nameRules);
    if (!trackerRules.length) {
      const addedTags = await assignMissingAutoTags(torrent, nameTags, knownTags, signature);
      return { completed: signature === autoTagSignatureRef.current, addedTags };
    }

    const response = await fetch(`/api/v2/torrents/trackers?hash=${encodeURIComponent(torrent.hash)}`, {
      credentials: 'same-origin',
    });
    if (!response.ok) {
      throw new Error(`Tracker lookup returned HTTP ${response.status}`);
    }
    const reportedTrackers = await response.json();
    const trackerUrls = realTrackerUrls(trackerUrlsFrom(torrent, reportedTrackers));
    // Magnet metadata and tracker lists can arrive after the torrent itself.
    // Keep this item pending until qBittorrent exposes a real tracker URL.
    if (!trackerUrls.length) {
      const addedTags = await assignMissingAutoTags(torrent, nameTags, knownTags, signature);
      return { completed: false, addedTags };
    }

    const desiredTags = matchingAutoTags(torrent, rules, trackerUrls);
    const addedTags = await assignMissingAutoTags(torrent, desiredTags, knownTags, signature);
    return { completed: signature === autoTagSignatureRef.current, addedTags };
  }

  function takeNextAutoTagEntry() {
    let next = null;
    autoTagQueue.current.forEach((entry, torrentId) => {
      if (!next || Number(entry.torrent.added_on || 0) > Number(next.entry.torrent.added_on || 0)) {
        next = { torrentId, entry };
      }
    });
    if (next) {
      autoTagQueue.current.delete(next.torrentId);
    }
    return next;
  }

  function drainAutoTagQueue() {
    if (!autoTagMounted.current) {
      return;
    }
    while (autoTagProcessing.current.size < AUTO_TAG_CONCURRENCY && autoTagQueue.current.size) {
      const next = takeNextAutoTagEntry();
      if (!next) {
        return;
      }
      const { torrentId, entry } = next;
      if (entry.signature !== autoTagSignatureRef.current) {
        continue;
      }
      autoTagProcessing.current.add(torrentId);
      reconcileAutoTagTorrent(entry.torrent, autoTagRulesRef.current, entry.signature)
        .then(result => {
          if (!autoTagMounted.current) {
            return;
          }
          mergeAutoTagsIntoTorrent(torrentId, result.addedTags, entry.signature);
          if (result.completed) {
            markAutoTagCompleted(torrentId, entry.signature);
          } else if (entry.signature === autoTagSignatureRef.current) {
            scheduleAutoTagRetry(torrentId);
          }
        })
        .catch(error => {
          if (autoTagMounted.current && entry.signature === autoTagSignatureRef.current) {
            scheduleAutoTagRetry(torrentId, error);
          }
        })
        .finally(() => {
          autoTagProcessing.current.delete(torrentId);
          drainAutoTagQueue();
        });
    }
  }

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
        if (import.meta.env.VITE_PREVIEW_MODE === 'true') {
          setTorrents(SAMPLE_TORRENTS);
          setStatus('preview');
        } else {
          setTorrents([]);
          setStatus('disconnected');
        }
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
      excludedCategories,
      excludedTagFilters,
      query,
      sort,
      // Drop the legacy single-tag key; JSON.stringify omits undefined values.
      tagFilter: undefined,
      tagFilters,
    });
  }, [activeFilter, categoryFilter, excludedCategories, excludedTagFilters, query, sort, tagFilters]);

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
    if (status !== 'live' || webApiVersion) {
      return;
    }
    let cancelled = false;
    fetch('/api/v2/app/webapiVersion', { credentials: 'same-origin' })
      .then(response => (response.ok ? response.text() : ''))
      .then(version => {
        if (!cancelled && version) {
          setWebApiVersion(version.trim());
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status, webApiVersion]);

  useEffect(() => {
    writeAppState({
      settings: pickUiSettings(settings),
    });
  }, [settings]);

  useEffect(() => {
    writeAppState({ autoTagRules });
  }, [autoTagRules]);

  useEffect(() => {
    function syncStoredState(event) {
      if (event.key !== APP_STATE_STORAGE_KEY) {
        return;
      }
      const nextState = readAppState();
      setActiveFilter(normalizeFilter(nextState.activeFilter));
      setCategoryFilter(nextState.categoryFilter || '');
      setExcludedCategories(normalizeExcludedCategories(nextState));
      setTagFilters(normalizeTagFilters(nextState));
      setExcludedTagFilters(normalizeExcludedTagFilters(nextState));
      setQuery(nextState.query || '');
      setSort(normalizeSort(nextState.sort));
      setAutoTagRules(readStoredAutoTagRules());
      setSettings(current => ({
        ...current,
        ...pickUiSettings(nextState.settings || {}),
      }));
    }

    window.addEventListener('storage', syncStoredState);
    return () => window.removeEventListener('storage', syncStoredState);
  }, []);

  useEffect(() => {
    if (autoTagCompletion.current.signature !== autoTagSignature) {
      autoTagCompletion.current = { signature: autoTagSignature, torrentIds: [] };
      autoTagQueue.current.clear();
      autoTagRetry.current.clear();
      scheduleAutoTagCompletionSave();
    }
    if (status !== 'live' || autoTagSignature === '[]') {
      return;
    }

    const liveTorrentIds = new Set(torrents.map(autoTagTorrentId));
    const retainedTorrentIds = autoTagCompletion.current.torrentIds
      .filter(torrentId => liveTorrentIds.has(torrentId));
    if (retainedTorrentIds.length !== autoTagCompletion.current.torrentIds.length) {
      autoTagCompletion.current.torrentIds = retainedTorrentIds;
      scheduleAutoTagCompletionSave();
    }
    const completed = new Set(autoTagCompletion.current.torrentIds);
    const now = Date.now();
    torrents.forEach(torrent => {
      const torrentId = autoTagTorrentId(torrent);
      const retry = autoTagRetry.current.get(torrentId);
      if (!completed.has(torrentId) &&
          !autoTagProcessing.current.has(torrentId) &&
          (!retry || retry.nextAttempt <= now)) {
        autoTagQueue.current.set(torrentId, { signature: autoTagSignature, torrent });
      }
    });
    drainAutoTagQueue();
  // The queue helpers use refs so in-flight work survives polling renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTagSignature, status, torrents]);

  useEffect(() => {
    autoTagMounted.current = true;
    return () => {
      autoTagMounted.current = false;
      if (autoTagPersistTimer.current) {
        window.clearTimeout(autoTagPersistTimer.current);
      }
      persistAutoTagCompletion();
    };
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
        ((!categoryFilter || torrent.category === categoryFilter) &&
          !excludedCategories.includes(torrent.category));
      const torrentTags = parseTags(torrent.tags);
      const matchesTag = settings.ui_show_tag_filters === false ||
        ((!tagFilters.length || tagFilters.every(tag => torrentTags.includes(tag))) &&
          !excludedTagFilters.some(tag => torrentTags.includes(tag)));
      const matchesQuery = searchableTorrentText(torrent).includes(query.trim().toLowerCase());
      return matchesFilter && matchesCategory && matchesTag && matchesQuery;
    });
  }, [activeFilter, categoryFilter, excludedCategories, excludedTagFilters, query, settings.ui_show_category_filters, settings.ui_show_tag_filters, tagFilters, torrents]);

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
  const selectedTorrents = useMemo(
    () => selectedActionHashes
      .map(hash => torrents.find(torrent => torrent.hash === hash))
      .filter(Boolean),
    // selectedActionHashes is derived from these two stable state values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [primaryHash, selectedHashes, torrents]
  );
  const torrentEditorApiVersion = webApiVersion || '2.15.0';

  const showQueueColumn = settings.ui_show_queue_column !== false;
  const showSizeColumn = Boolean(settings.ui_show_size_column);
  const tableColumns = COLUMNS.filter(column =>
    (column.key !== 'priority' || showQueueColumn) && (column.key !== 'size' || showSizeColumn)
  );
  const sortIsVisible = columnSortKeys(tableColumns).includes(sort.key);
  const maxQueuePriority = useMemo(
    () => torrents.reduce(
      (max, torrent) => (torrent.priority > 0 ? Math.max(max, torrent.priority) : max),
      0
    ),
    [torrents]
  );

  // Hiding a column would otherwise leave an invisible sort (e.g. '#' or Size)
  // with no header indicator and no way to change it.
  useEffect(() => {
    if (!sortIsVisible) {
      setSort({ key: 'name', direction: 'asc' });
    }
  }, [sortIsVisible]);

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
    if (excludedTagFilters.includes(tag)) {
      setExcludedTagFilters(current => current.filter(item => item !== tag));
      return;
    }
    setTagFilters(current =>
      current.includes(tag)
        ? current.filter(item => item !== tag)
        : current.concat(tag)
    );
  }

  function excludeTagFilter(tag) {
    setTagFilters(current => current.filter(item => item !== tag));
    setExcludedTagFilters(current => current.includes(tag) ? current : current.concat(tag));
  }

  function toggleCategoryFilter(category) {
    if (excludedCategories.includes(category)) {
      setExcludedCategories(current => current.filter(item => item !== category));
      return;
    }
    setCategoryFilter(current => current === category ? '' : category);
  }

  function excludeCategoryFilter(category) {
    setCategoryFilter(current => current === category ? '' : current);
    setExcludedCategories(current => current.includes(category) ? current : current.concat(category));
  }

  function resetCategoryFilters() {
    setCategoryFilter('');
    setExcludedCategories([]);
  }

  function resetTagFilters() {
    setTagFilters([]);
    setExcludedTagFilters([]);
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

    if (status !== 'live') {
      return;
    }

    const body = new URLSearchParams({ hashes: selectedActionHashes.join('|') });

    postFirstAvailable(TORRENT_ACTION_URLS[action], body);
  }

  function handleActionAll(action) {
    if (status !== 'live') {
      return;
    }
    postFirstAvailable(TORRENT_ACTION_URLS[action], new URLSearchParams({ hashes: 'all' }));
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
    setTorrentEditorOpen(false);
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
      setAddNotice('Not connected: torrent add was not sent to qBittorrent.');
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

  function saveSettings(nextAutoTagRules) {
    // Auto-tag rules are staged in the settings panel and committed here, so
    // the reconciler never runs against a half-typed tag.
    if (Array.isArray(nextAutoTagRules)) {
      setAutoTagRules(nextAutoTagRules);
    }
    if (status !== 'live') {
      setNotice('Not connected: auto-tag rules were saved locally, qBittorrent settings were not written.');
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
        setNotice('qBittorrent settings and local auto-tag rules saved.');
      })
      .catch(() => setNotice('qBittorrent rejected the settings update.'));
  }

  function revertWebUI() {
    if (status !== 'live') {
      updateSetting('alternative_webui_enabled', false);
      setNotice('Not connected: disable Alternative WebUI in qBittorrent to revert.');
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

  async function loadTorrentEditorTrackers(torrentList = selectedTorrents, reportFailures = true) {
    if (!torrentList.length || status !== 'live') {
      setTorrentEditorTrackers({});
      return;
    }
    setTorrentEditorLoading(true);
    const results = await Promise.allSettled(torrentList.map(async torrent => {
      const response = await fetch(`/api/v2/torrents/trackers?hash=${encodeURIComponent(torrent.hash)}`, {
        credentials: 'same-origin',
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return [torrent.hash, await response.json()];
    }));
    const nextTrackers = {};
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const [hash, trackers] = result.value;
        nextTrackers[hash] = trackers;
      } else {
        nextTrackers[torrentList[index].hash] = [];
      }
    });
    setTorrentEditorTrackers(nextTrackers);
    setTorrentEditorLoading(false);
    const failures = results.filter(result => result.status === 'rejected').length;
    if (reportFailures && failures) {
      setTorrentEditorNotice({
        tone: 'warning',
        text: `Could not load trackers for ${failures} of ${torrentList.length} torrents.`,
      });
    }
  }

  function openTorrentEditor() {
    if (!selectedTorrents.length || status !== 'live') {
      return;
    }
    setTorrentEditorNotice(null);
    setTorrentEditorTrackers({});
    setTorrentEditorOpen(true);
    loadTorrentEditorTrackers(selectedTorrents);
  }

  function closeTorrentEditor() {
    if (torrentEditorBusy || torrentEditorTrackerBusy) {
      return;
    }
    setTorrentEditorOpen(false);
    setTorrentEditorTrackers({});
    setTorrentEditorNotice(null);
  }

  async function saveTorrentEdits(initialDraft, draft) {
    const changed = getChangedTorrentFields(initialDraft, draft);
    const changedKeys = Object.keys(changed);
    if (!changedKeys.length) {
      setTorrentEditorNotice({ tone: 'muted', text: 'No settings changed.' });
      return;
    }
    if (!selectedTorrents.length || status !== 'live') {
      setTorrentEditorNotice({ tone: 'error', text: 'No connected torrents are selected.' });
      return;
    }

    setTorrentEditorBusy(true);
    setTorrentEditorNotice({ tone: 'muted', text: 'Applying changes…' });
    const hashes = selectedTorrents.map(torrent => torrent.hash);
    const joinedHashes = hashes.join('|');
    const requests = [];
    const queue = (label, url, values) => {
      requests.push({ label, run: () => postForm(url, values) });
    };
    let autoManagementRequest = null;

    if (Object.hasOwn(changed, 'name')) {
      hashes.forEach(hash => queue('name', '/api/v2/torrents/rename', { hash, name: changed.name }));
    }
    if (Object.hasOwn(changed, 'save_path')) {
      queue('save location', '/api/v2/torrents/setLocation', { hashes: joinedHashes, location: changed.save_path });
    }
    if (Object.hasOwn(changed, 'category')) {
      queue('category', '/api/v2/torrents/setCategory', { hashes: joinedHashes, category: changed.category });
    }
    if (Object.hasOwn(changed, 'comment')) {
      queue('comment', '/api/v2/torrents/setComment', { hashes: joinedHashes, comment: changed.comment });
    }
    if (Object.hasOwn(changed, 'dl_limit')) {
      queue('download limit', '/api/v2/torrents/setDownloadLimit', { hashes: joinedHashes, limit: changed.dl_limit });
    }
    if (Object.hasOwn(changed, 'up_limit')) {
      queue('upload limit', '/api/v2/torrents/setUploadLimit', { hashes: joinedHashes, limit: changed.up_limit });
    }
    if (Object.hasOwn(changed, 'auto_tmm')) {
      // setLocation disables Auto TMM, so this request runs after the main
      // batch to make the explicit checkbox value the final state.
      autoManagementRequest = {
        label: 'automatic management',
        run: () => postForm('/api/v2/torrents/setAutoManagement', { hashes: joinedHashes, enable: changed.auto_tmm }),
      };
    }
    if (Object.hasOwn(changed, 'force_start')) {
      queue('force start', '/api/v2/torrents/setForceStart', { hashes: joinedHashes, value: changed.force_start });
    }
    if (Object.hasOwn(changed, 'super_seeding')) {
      queue('super seeding', '/api/v2/torrents/setSuperSeeding', { hashes: joinedHashes, value: changed.super_seeding });
    }
    if (Object.hasOwn(changed, 'seq_dl')) {
      queue('sequential download', '/api/v2/torrents/toggleSequentialDownload', { hashes: joinedHashes });
    }
    if (Object.hasOwn(changed, 'f_l_piece_prio')) {
      queue('first/last piece priority', '/api/v2/torrents/toggleFirstLastPiecePrio', { hashes: joinedHashes });
    }

    const shareKeys = ['ratio_limit', 'seeding_time_limit', 'inactive_seeding_time_limit', 'share_limit_action'];
    if (shareKeys.some(key => Object.hasOwn(changed, key))) {
      selectedTorrents.forEach(torrent => {
        const values = {
          hashes: torrent.hash,
          ratioLimit: Object.hasOwn(changed, 'ratio_limit') ? changed.ratio_limit : torrent.ratio_limit ?? -2,
          seedingTimeLimit: Object.hasOwn(changed, 'seeding_time_limit') ? changed.seeding_time_limit : torrent.seeding_time_limit ?? -2,
          inactiveSeedingTimeLimit: Object.hasOwn(changed, 'inactive_seeding_time_limit')
            ? changed.inactive_seeding_time_limit
            : torrent.inactive_seeding_time_limit ?? -2,
        };
        if (compareApiVersions(torrentEditorApiVersion, '2.12.0') >= 0) {
          values.shareLimitAction = Object.hasOwn(changed, 'share_limit_action')
            ? changed.share_limit_action
            : torrent.share_limit_action || 'Default';
        }
        if (compareApiVersions(torrentEditorApiVersion, '2.15.3') >= 0) {
          values.shareLimitsMode = torrent.share_limits_mode || 'Default';
        }
        queue('share limits', '/api/v2/torrents/setShareLimits', values);
      });
    }

    if (Object.hasOwn(changed, 'tags')) {
      const nextTags = parseTags(changed.tags);
      if (nextTags.length) {
        try {
          await postForm('/api/v2/torrents/createTags', { tags: nextTags.join(',') });
        } catch {
          // Existing tags can still be assigned when createTags is unavailable
          // or reports a duplicate; the per-torrent calls below are authoritative.
        }
      }
      selectedTorrents.forEach(torrent => {
        const oldTags = parseTags(torrent.tags);
        const toRemove = oldTags.filter(tag => !nextTags.includes(tag));
        const toAdd = nextTags.filter(tag => !oldTags.includes(tag));
        if (toRemove.length) {
          queue('tags', '/api/v2/torrents/removeTags', { hashes: torrent.hash, tags: toRemove.join(',') });
        }
        if (toAdd.length) {
          queue('tags', '/api/v2/torrents/addTags', { hashes: torrent.hash, tags: toAdd.join(',') });
        }
      });
    }

    const results = await Promise.allSettled(requests.map(request => request.run()));
    if (autoManagementRequest) {
      requests.push(autoManagementRequest);
      results.push(...await Promise.allSettled([autoManagementRequest.run()]));
    }
    const failures = results
      .map((result, index) => ({ result, label: requests[index].label }))
      .filter(item => item.result.status === 'rejected');

    if (failures.length) {
      const labels = Array.from(new Set(failures.map(failure => failure.label))).join(', ');
      setTorrentEditorNotice({
        tone: 'error',
        text: `${failures.length} update${failures.length === 1 ? '' : 's'} failed: ${labels}. Other changes may have succeeded.`,
      });
      setTorrentEditorBusy(false);
      return;
    }

    setTorrents(current => current.map(torrent => {
      if (!hashes.includes(torrent.hash)) {
        return torrent;
      }
      const next = { ...torrent, ...changed };
      if (Object.hasOwn(changed, 'tags')) {
        next.tags = parseTags(changed.tags).join(', ');
      }
      if (Object.hasOwn(changed, 'save_path') && !Object.hasOwn(changed, 'auto_tmm')) {
        next.auto_tmm = false;
      }
      return next;
    }));
    setLastSync(new Date().toLocaleTimeString());
    setTorrentEditorBusy(false);
    setTorrentEditorOpen(false);
    setTorrentEditorTrackers({});
  }

  async function runTrackerAction(action, targetHashes, valuesForHash) {
    if (!targetHashes.length || status !== 'live') {
      return false;
    }
    setTorrentEditorTrackerBusy(action);
    setTorrentEditorNotice({ tone: 'muted', text: `${action}…` });
    const results = await Promise.allSettled(targetHashes.map(hash => {
      return postForm(valuesForHash.url, valuesForHash.params(hash));
    }));
    const failures = results.filter(result => result.status === 'rejected').length;
    await loadTorrentEditorTrackers(selectedTorrents, false);
    setTorrentEditorTrackerBusy('');
    if (failures) {
      setTorrentEditorNotice({
        tone: failures === results.length ? 'error' : 'warning',
        text: `${action} failed for ${failures} of ${results.length} torrents.`,
      });
      return false;
    }
    setTorrentEditorNotice({ tone: 'success', text: `${action} completed for ${results.length} torrent${results.length === 1 ? '' : 's'}.` });
    return true;
  }

  function addTorrentTrackers(urls) {
    return runTrackerAction('Adding trackers', selectedTorrents.map(torrent => torrent.hash), {
      url: '/api/v2/torrents/addTrackers',
      params: hash => ({ hash, urls: urls.join('\n') }),
    });
  }

  function editTorrentTracker(originalUrl, newUrl) {
    const targetHashes = selectedTorrents
      .filter(torrent => editableTrackers(torrentEditorTrackers[torrent.hash]).some(tracker => {
        return (typeof tracker === 'string' ? tracker : tracker.url) === originalUrl;
      }))
      .map(torrent => torrent.hash);
    const originalParameter = usesCurrentTrackerEditParameter(torrentEditorApiVersion) ? 'url' : 'origUrl';
    return runTrackerAction('Replacing tracker', targetHashes, {
      url: '/api/v2/torrents/editTracker',
      params: hash => ({ hash, [originalParameter]: originalUrl, newUrl }),
    });
  }

  function removeTorrentTracker(url) {
    const targetHashes = selectedTorrents
      .filter(torrent => editableTrackers(torrentEditorTrackers[torrent.hash]).some(tracker => {
        return (typeof tracker === 'string' ? tracker : tracker.url) === url;
      }))
      .map(torrent => torrent.hash);
    return runTrackerAction('Removing tracker', targetHashes, {
      url: '/api/v2/torrents/removeTrackers',
      params: hash => ({ hash, urls: encodeURIComponent(url) }),
    });
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
    const nextTags = parseTags(tagDraft);
    setTorrents(current =>
      current.map(torrent =>
        selectedActionHashes.includes(torrent.hash)
          ? { ...torrent, tags: nextTags.join(', ') }
          : torrent
      )
    );
    setTagEditorOpen(false);

    if (status === 'live') {
      if (nextTags.length) {
        fetch('/api/v2/torrents/createTags', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ tags: nextTags.join(',') }),
        });
      }
      selectedTorrents.forEach(torrent => {
        const oldTags = parseTags(torrent.tags);
        const toRemove = oldTags.filter(tag => !nextTags.includes(tag));
        const toAdd = nextTags.filter(tag => !oldTags.includes(tag));
        if (toRemove.length) {
          postForm('/api/v2/torrents/removeTags', {
            hashes: torrent.hash,
            tags: toRemove.join(','),
          }).catch(() => {});
        }
        if (toAdd.length) {
          postForm('/api/v2/torrents/addTags', {
            hashes: torrent.hash,
            tags: toAdd.join(','),
          }).catch(() => {});
        }
      });
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

  if (status === 'disconnected') {
    return <DisconnectedPage accent={settings.ui_accent_color || '#f07b24'} />;
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
        excludedCategories={excludedCategories}
        excludedTagFilters={excludedTagFilters}
        latestRelease={latestRelease}
        onExcludeCategory={excludeCategoryFilter}
        onExcludeTag={excludeTagFilter}
        onFilter={setActiveFilter}
        onOpenVersion={() => setVersionModalOpen(true)}
        onResetCategoryFilters={resetCategoryFilters}
        onResetTagFilters={resetTagFilters}
        onToggleCategory={toggleCategoryFilter}
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
            <button onClick={() => handleActionAll('resume')} title="Resume every torrent" type="button">Resume All</button>
            <button onClick={() => handleActionAll('stop')} title="Stop every torrent" type="button">Stop All</button>
            <button onClick={() => handleAction('recheck')} type="button">Recheck</button>
            <button
              aria-label="Edit selected torrents"
              className="edit-torrents-button"
              disabled={!selectedActionHashes.length || status !== 'live'}
              onClick={openTorrentEditor}
              title="Edit selected torrents"
              type="button"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M6 3.75h7.25L18 8.5v3.25M13 3.75V8.5h5M5.5 20.25h3.25l9.5-9.5-3.25-3.25-9.5 9.5v3.25Z" />
                <path d="m13.75 8.75 3.25 3.25" />
              </svg>
            </button>
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
          <span title={`synced ${lastSync || '--:--:--'}`}>
            {selectedCount
              ? `${selectedCount} selected / ${visibleTorrents.length} filtered`
              : `${visibleTorrents.length} filtered`}
          </span>
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
          autoTagRules={autoTagRules}
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

      {torrentEditorOpen && selectedTorrents.length > 0 && (
        <TorrentEditor
          allCategories={categories}
          allTags={tags}
          apiVersion={torrentEditorApiVersion}
          busy={torrentEditorBusy}
          key={selectedActionHashes.join('|')}
          loadingTrackers={torrentEditorLoading}
          notice={torrentEditorNotice}
          onClose={closeTorrentEditor}
          onSave={saveTorrentEdits}
          onTrackerAdd={addTorrentTrackers}
          onTrackerEdit={editTorrentTracker}
          onTrackerRemove={removeTorrentTracker}
          selectedTorrents={selectedTorrents}
          trackerBusy={torrentEditorTrackerBusy}
          trackersByHash={torrentEditorTrackers}
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
