import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import App from './App';
import { SAMPLE_TORRENTS } from './lib/sampleData';

function mockDefaultApi(url) {
  if (String(url).includes('/api/v2/torrents/info')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(SAMPLE_TORRENTS),
    });
  }
  return Promise.reject(new Error('offline'));
}

beforeEach(() => {
  window.localStorage.clear();
  vi.stubEnv('VITE_APP_VERSION', '1.2.0');
  // Most component tests use a live API response backed by stable fixtures.
  // Tests for auth, queue APIs, and disconnection override this when needed.
  vi.spyOn(global, 'fetch').mockImplementation(mockDefaultApi);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function mockFetchWithLatestRelease(release) {
  global.fetch.mockImplementation(url =>
    String(url).includes('api.github.com')
      ? Promise.resolve({ ok: true, json: () => Promise.resolve(release) })
      : mockDefaultApi(url)
  );
}

function fireBrowserDoubleClick(element) {
  fireEvent.click(element, { detail: 1 });
  fireEvent.click(element, { detail: 2 });
  fireEvent.doubleClick(element, { detail: 2 });
}

test('renders qbitctl shell', () => {
  const { getByText } = render(<App />);
  const headingElement = getByText(/qbitctl/i);
  expect(headingElement).toBeInTheDocument();
});

test('settings can create and persist an auto-tag rule', async () => {
  const { findByText, getByLabelText, getByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');
  fireEvent.click(getByLabelText('Settings'));
  fireEvent.click(getByText('+ Add auto-tag rule'));

  fireEvent.change(getByLabelText('Auto-tag rule 1 field'), { target: { value: 'tracker_url' } });
  fireEvent.change(getByLabelText('Auto-tag rule 1 string'), { target: { value: 'tracker.com' } });
  fireEvent.change(getByLabelText('Auto-tag rule 1 tag'), { target: { value: 'Tracker' } });
  fireEvent.click(getByText('Save settings'));

  await waitFor(() => {
    const stored = JSON.parse(window.localStorage.getItem('qbitctl.appState.v1'));
    expect(stored.autoTagRules).toMatchObject([
      { field: 'tracker_url', operator: 'contains', value: 'tracker.com', tag: 'Tracker' },
    ]);
  });
});

test('a tag typed one character at a time is only applied once, on save', async () => {
  const applied = [];
  global.fetch.mockImplementation((url, options = {}) => {
    const value = String(url);
    if (value.includes('/api/v2/torrents/info')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(SAMPLE_TORRENTS) });
    }
    if (value.includes('/api/v2/torrents/trackers')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([{ url: 'https://tracker.com/announce/cdjhfdkjshdjksfhd' }]),
      });
    }
    if (options.method === 'POST' && value.includes('/addTags')) {
      applied.push(String(options.body));
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') });
    }
    if (options.method === 'POST' && (value.includes('/createTags') || value.includes('/setPreferences'))) {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') });
    }
    return Promise.reject(new Error('offline'));
  });

  const { findByText, getByLabelText, getByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');
  fireEvent.click(getByLabelText('Settings'));
  fireEvent.click(getByText('+ Add auto-tag rule'));
  fireEvent.change(getByLabelText('Auto-tag rule 1 field'), { target: { value: 'tracker_url' } });
  fireEvent.change(getByLabelText('Auto-tag rule 1 string'), { target: { value: 'tracker.com' } });

  // Every keystroke used to be a live rule, which tagged the whole library
  // with each prefix of the tag being typed.
  for (const partial of ['T', 'Tr', 'Tr4', 'Tr4k', 'Tr4ke', 'Tr4ker']) {
    fireEvent.change(getByLabelText('Auto-tag rule 1 tag'), { target: { value: partial } });
    await act(async () => {});
  }
  expect(applied).toEqual([]);
  expect(JSON.parse(window.localStorage.getItem('qbitctl.appState.v1')).autoTagRules).toEqual([]);

  fireEvent.click(getByText('Save settings'));
  await waitFor(() => expect(applied.length).toBeGreaterThan(0));
  applied.forEach(body => expect(body).toContain('tags=Tr4ker'));
});

test('newly observed torrents receive matching name and tracker auto-tags', async () => {
  window.localStorage.setItem('qbitctl.appState.v1', JSON.stringify({
    autoTagRules: [
      { id: 'tracker', field: 'tracker_url', operator: 'contains', value: 'tracker.com', tag: 'Tracker' },
      { id: 'show', field: 'name', operator: 'like', value: '%S%E%', tag: 'tvshow' },
    ],
  }));
  const addedTorrent = {
    ...SAMPLE_TORRENTS[0],
    hash: 'new-show',
    name: 'Malcom.s11e09.hevc.mkv',
    tags: '',
    trackers: undefined,
  };
  let infoRequests = 0;
  let torrentPoll;
  vi.spyOn(window, 'setInterval').mockImplementation(callback => {
    if (!torrentPoll) torrentPoll = callback;
    return 1;
  });
  global.fetch.mockImplementation((url, options = {}) => {
    const value = String(url);
    if (value.includes('/api/v2/torrents/info')) {
      infoRequests += 1;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(infoRequests === 1 ? SAMPLE_TORRENTS : SAMPLE_TORRENTS.concat(addedTorrent)),
      });
    }
    if (value.includes('/api/v2/torrents/trackers') && value.includes('new-show')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([{ url: 'https://tracker.com/announce/cdjhfdkjshdjksfhd' }]),
      });
    }
    if (options.method === 'POST' && (value.includes('/createTags') || value.includes('/addTags'))) {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') });
    }
    return Promise.reject(new Error('offline'));
  });

  const { findByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');
  await act(async () => torrentPoll());

  await waitFor(() => {
    const call = global.fetch.mock.calls.find(([url]) => String(url).includes('/api/v2/torrents/addTags'));
    expect(call).toBeTruthy();
    expect(String(call[1].body)).toBe('hashes=new-show&tags=Tracker%2Ctvshow');
  });
});

test('auto-tag reconciles a previously missed torrent when the app starts', async () => {
  window.localStorage.setItem('qbitctl.appState.v1', JSON.stringify({
    autoTagRules: [
      { id: 'tracker', field: 'tracker_url', operator: 'contains', value: 'tr4ker', tag: 'Tr4ker' },
    ],
  }));
  const missedTorrent = {
    ...SAMPLE_TORRENTS[0],
    hash: 'missed-on-startup',
    added_on: 100,
    tags: '',
    tracker: '',
  };
  global.fetch.mockImplementation((url, options = {}) => {
    const value = String(url);
    if (value.includes('/api/v2/torrents/info')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([missedTorrent]) });
    }
    if (value.includes('/api/v2/torrents/trackers')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([{ url: 'https://tk.tr4ker.net/announce/token' }]),
      });
    }
    if (options.method === 'POST') {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') });
    }
    return Promise.reject(new Error('offline'));
  });

  render(<App />);

  await waitFor(() => {
    const call = global.fetch.mock.calls.find(([url]) => String(url).includes('/api/v2/torrents/addTags'));
    expect(call).toBeTruthy();
    expect(String(call[1].body)).toBe('hashes=missed-on-startup&tags=Tr4ker');
  });
});

test('auto-tag retries when tracker metadata appears after the torrent', async () => {
  window.localStorage.setItem('qbitctl.appState.v1', JSON.stringify({
    autoTagRules: [
      { id: 'tracker', field: 'tracker_url', operator: 'contains', value: 'tracker.com', tag: 'Tracker' },
    ],
  }));
  const torrent = {
    ...SAMPLE_TORRENTS[0],
    hash: 'delayed-tracker',
    added_on: 200,
    tags: '',
    tracker: '',
    trackers: undefined,
  };
  let now = 1_000;
  let trackerRequests = 0;
  let torrentPoll;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  vi.spyOn(window, 'setInterval').mockImplementation(callback => {
    if (!torrentPoll) torrentPoll = callback;
    return 1;
  });
  global.fetch.mockImplementation((url, options = {}) => {
    const value = String(url);
    if (value.includes('/api/v2/torrents/info')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([torrent]) });
    }
    if (value.includes('/api/v2/torrents/trackers')) {
      trackerRequests += 1;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(trackerRequests === 1
          ? [{ url: '** [DHT] **' }]
          : [{ url: 'https://tracker.com/announce/token' }]),
      });
    }
    if (options.method === 'POST') {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') });
    }
    return Promise.reject(new Error('offline'));
  });

  render(<App />);
  await waitFor(() => expect(trackerRequests).toBe(1));
  expect(global.fetch.mock.calls.some(([url]) => String(url).includes('/api/v2/torrents/addTags'))).toBe(false);

  now += 6_000;
  await act(async () => torrentPoll());

  await waitFor(() => {
    expect(trackerRequests).toBe(2);
    const call = global.fetch.mock.calls.find(([url]) => String(url).includes('/api/v2/torrents/addTags'));
    expect(String(call[1].body)).toBe('hashes=delayed-tracker&tags=Tracker');
  });
});

test('auto-tag retries a failed tag assignment instead of marking it complete', async () => {
  window.localStorage.setItem('qbitctl.appState.v1', JSON.stringify({
    autoTagRules: [
      { id: 'name', field: 'name', operator: 'contains', value: 'Malcom', tag: 'tvshow' },
    ],
  }));
  const torrent = {
    ...SAMPLE_TORRENTS[0],
    hash: 'retry-add-tags',
    added_on: 300,
    name: 'Malcom.s11e09.hevc.mkv',
    tags: '',
  };
  let now = 1_000;
  let addTagRequests = 0;
  let torrentPoll;
  vi.spyOn(Date, 'now').mockImplementation(() => now);
  vi.spyOn(window, 'setInterval').mockImplementation(callback => {
    if (!torrentPoll) torrentPoll = callback;
    return 1;
  });
  global.fetch.mockImplementation((url, options = {}) => {
    const value = String(url);
    if (value.includes('/api/v2/torrents/info')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([torrent]) });
    }
    if (value.includes('/api/v2/torrents/createTags')) {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') });
    }
    if (value.includes('/api/v2/torrents/addTags')) {
      addTagRequests += 1;
      return Promise.resolve(addTagRequests === 1
        ? { ok: false, status: 500, text: () => Promise.resolve('temporary failure') }
        : { ok: true, status: 200, text: () => Promise.resolve('') });
    }
    if (options.method === 'POST') {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') });
    }
    return Promise.reject(new Error('offline'));
  });

  render(<App />);
  await waitFor(() => expect(addTagRequests).toBe(1));

  now += 6_000;
  await act(async () => torrentPoll());

  await waitFor(() => expect(addTagRequests).toBe(2));
  now += 6_000;
  await act(async () => torrentPoll());
  expect(addTagRequests).toBe(2);
});

test('completed auto-tag reconciliation is remembered across page reloads', async () => {
  window.localStorage.setItem('qbitctl.appState.v1', JSON.stringify({
    autoTagRules: [
      { id: 'name', field: 'name', operator: 'contains', value: 'Malcom', tag: 'tvshow' },
    ],
  }));
  const torrent = {
    ...SAMPLE_TORRENTS[0],
    hash: 'remember-completion',
    added_on: 400,
    name: 'Malcom.s11e09.hevc.mkv',
    tags: '',
  };
  let addTagRequests = 0;
  global.fetch.mockImplementation((url, options = {}) => {
    const value = String(url);
    if (value.includes('/api/v2/torrents/info')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([torrent]) });
    }
    if (value.includes('/api/v2/torrents/addTags')) {
      addTagRequests += 1;
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') });
    }
    if (options.method === 'POST') {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') });
    }
    return Promise.reject(new Error('offline'));
  });

  const firstRender = render(<App />);
  await waitFor(() => expect(addTagRequests).toBe(1));
  await firstRender.findByText('tvshow');
  firstRender.unmount();

  expect(readStoredCompletionIds()).toContain('remember-completion:400');
  const secondRender = render(<App />);
  await secondRender.findByText('Malcom.s11e09.hevc.mkv');
  await act(async () => Promise.resolve());
  expect(addTagRequests).toBe(1);
});

function readStoredCompletionIds() {
  const stored = JSON.parse(window.localStorage.getItem('qbitctl.appState.v1'));
  return stored.autoTagCompletion?.torrentIds || [];
}

test('sidebar offers Stopped but no Paused filter', async () => {
  const { findByLabelText } = render(<App />);
  const nav = await findByLabelText('Torrent filters');
  expect(within(nav).getByText('Stopped')).toBeInTheDocument();
  expect(within(nav).queryByText('Paused')).toBeNull();
});

test('toolbar exposes Stop instead of Pause', async () => {
  const { findByLabelText } = render(<App />);
  const toolbar = await findByLabelText('Torrent actions');
  expect(within(toolbar).getByText('Stop')).toBeInTheDocument();
  expect(within(toolbar).queryByText('Pause')).toBeNull();
});

function mockTorrentEditorApi() {
  global.fetch.mockImplementation((url, options = {}) => {
    const value = String(url);
    if (value.includes('/api/v2/torrents/info')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(SAMPLE_TORRENTS) });
    }
    if (value.includes('/api/v2/app/webapiVersion')) {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('2.15.0') });
    }
    if (value.includes('/api/v2/torrents/trackers')) {
      const hash = new URL(value, 'http://localhost').searchParams.get('hash');
      const torrent = SAMPLE_TORRENTS.find(item => item.hash === hash);
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(torrent?.trackers || []) });
    }
    if (options.method === 'POST' && value.includes('/api/v2/torrents/')) {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') });
    }
    return Promise.reject(new Error('offline'));
  });
}

test('torrent editor button follows selection and exposes single-torrent settings', async () => {
  mockTorrentEditorApi();
  const { findByLabelText, findByRole, findByText } = render(<App />);
  const toolbar = await findByLabelText('Torrent actions');
  const editButton = within(toolbar).getByLabelText('Edit selected torrents');
  expect(editButton).toBeDisabled();

  fireEvent.click(await findByText('archlinux-2026.05.01-x86_64.iso'));
  expect(editButton).toBeEnabled();
  fireEvent.click(editButton);

  const dialog = await findByRole('dialog', { name: 'Edit torrent' });
  expect(within(dialog).getByText('Torrent name')).toBeInTheDocument();
  expect(within(dialog).getByText('Save location')).toBeInTheDocument();
  expect(within(dialog).getByText('Download limit (B/s, 0 = unlimited)')).toBeInTheDocument();
  expect(within(dialog).getByText('Automatic Torrent Management')).toBeInTheDocument();
  expect(within(dialog).getByText('Comment')).toBeInTheDocument();
});

test('multi-torrent editor hides mixed settings but retains common settings and trackers', async () => {
  mockTorrentEditorApi();
  const { findByLabelText, findByRole, findByText } = render(<App />);
  fireEvent.click(await findByText('archlinux-2026.05.01-x86_64.iso'));
  fireEvent.click(await findByText('nightly.build.assets.pack'), { ctrlKey: true });
  fireEvent.click(await findByLabelText('Edit selected torrents'));

  const dialog = await findByRole('dialog', { name: 'Edit torrents' });
  expect(within(dialog).queryByText('Torrent name')).toBeNull();
  expect(within(dialog).queryByText('Save location')).toBeNull();
  expect(within(dialog).queryByText('Automatic Torrent Management')).toBeNull();
  expect(within(dialog).getByText('Download limit (B/s, 0 = unlimited)')).toBeInTheDocument();
  expect(within(dialog).getByText(/settings with different values are hidden/i)).toBeInTheDocument();
  expect(await within(dialog).findByText('udp://tracker.internal.local:6969/announce')).toBeInTheDocument();
});

test('torrent editor applies changed location to the selected hashes', async () => {
  mockTorrentEditorApi();
  const { findByLabelText, findByRole, findByText } = render(<App />);
  fireEvent.click(await findByText('archlinux-2026.05.01-x86_64.iso'));
  fireEvent.click(await findByLabelText('Edit selected torrents'));
  const dialog = await findByRole('dialog', { name: 'Edit torrent' });
  const locationInput = within(dialog).getByText('Save location').closest('label').querySelector('input');

  fireEvent.change(locationInput, { target: { value: '/data/torrents/archive' } });
  fireEvent.click(within(dialog).getByText('Apply settings'));

  await waitFor(() => {
    const call = global.fetch.mock.calls.find(([url]) => String(url).includes('/api/v2/torrents/setLocation'));
    expect(call).toBeTruthy();
    expect(String(call[1].body)).toBe('hashes=linux-iso-stack&location=%2Fdata%2Ftorrents%2Farchive');
  });
});

test('torrent editor sends the qBittorrent 5.2 share-limit payload', async () => {
  mockTorrentEditorApi();
  const { findByLabelText, findByRole, findByText } = render(<App />);
  fireEvent.click(await findByText('archlinux-2026.05.01-x86_64.iso'));
  fireEvent.click(await findByLabelText('Edit selected torrents'));
  const dialog = await findByRole('dialog', { name: 'Edit torrent' });
  const ratioRow = within(dialog).getByText('Ratio limit').closest('label');

  fireEvent.change(ratioRow.querySelector('select'), { target: { value: 'custom' } });
  fireEvent.click(within(dialog).getByText('Apply settings'));

  await waitFor(() => {
    const call = global.fetch.mock.calls.find(([url]) => String(url).includes('/api/v2/torrents/setShareLimits'));
    expect(call).toBeTruthy();
    expect(String(call[1].body)).toBe(
      'hashes=linux-iso-stack&ratioLimit=1&seedingTimeLimit=-2&inactiveSeedingTimeLimit=-2&shareLimitAction=Default'
    );
  });
});

test('tracker replacement is applied to every selected torrent containing the URL', async () => {
  mockTorrentEditorApi();
  const { findByLabelText, findByRole, findByText } = render(<App />);
  fireEvent.click(await findByText('archlinux-2026.05.01-x86_64.iso'));
  fireEvent.click(await findByText('public-domain-documentary-collection'), { ctrlKey: true });
  fireEvent.click(await findByLabelText('Edit selected torrents'));
  const dialog = await findByRole('dialog', { name: 'Edit torrents' });
  const trackerUrl = await within(dialog).findByText('udp://tracker.opentrackr.org:1337/announce');
  const trackerRow = trackerUrl.closest('li');

  expect(within(trackerRow).getByText('2 of 2 torrents')).toBeInTheDocument();
  fireEvent.click(within(trackerRow).getByText('Edit'));
  const replacement = within(trackerRow).getByLabelText('Replacement URL for udp://tracker.opentrackr.org:1337/announce');
  fireEvent.change(replacement, { target: { value: 'udp://tracker.example.test:6969/announce' } });
  fireEvent.click(within(trackerRow).getByText('Replace'));

  await waitFor(() => {
    const calls = global.fetch.mock.calls.filter(([url]) => String(url).includes('/api/v2/torrents/editTracker'));
    expect(calls).toHaveLength(2);
    calls.forEach(([, options]) => {
      expect(String(options.body)).toContain('url=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce');
      expect(String(options.body)).toContain('newUrl=udp%3A%2F%2Ftracker.example.test%3A6969%2Fannounce');
    });
  });
});

test('tracker add and confirmed remove run across the current selection', async () => {
  mockTorrentEditorApi();
  const { findByLabelText, findByRole, findByText } = render(<App />);
  fireEvent.click(await findByText('archlinux-2026.05.01-x86_64.iso'));
  fireEvent.click(await findByText('public-domain-documentary-collection'), { ctrlKey: true });
  fireEvent.click(await findByLabelText('Edit selected torrents'));
  const dialog = await findByRole('dialog', { name: 'Edit torrents' });
  const addRow = within(dialog).getByText('New tracker URLs, one per line').closest('label');

  fireEvent.change(addRow.querySelector('textarea'), {
    target: { value: 'udp://tracker.new.test:80/announce' },
  });
  fireEvent.click(within(addRow).getByText('Add to 2'));

  await waitFor(() => {
    expect(global.fetch.mock.calls.filter(([url]) => String(url).includes('/api/v2/torrents/addTrackers')))
      .toHaveLength(2);
  });

  const trackerUrl = await within(dialog).findByText('udp://tracker.opentrackr.org:1337/announce');
  const trackerRow = trackerUrl.closest('li');
  await waitFor(() => expect(within(trackerRow).getByText('Remove')).toBeEnabled());
  fireEvent.click(within(trackerRow).getByText('Remove'));
  fireEvent.click(within(trackerRow).getByText('Confirm 2'));

  await waitFor(() => {
    expect(global.fetch.mock.calls.filter(([url]) => String(url).includes('/api/v2/torrents/removeTrackers')))
      .toHaveLength(2);
  });
});

test('stopped preview torrent shows a Stopped badge', async () => {
  const { findByText } = render(<App />);
  expect(await findByText('Stopped', { selector: '.status-badge' })).toBeInTheDocument();
});

test('tag filters support multi-select with AND matching', async () => {
  const { findByLabelText, findByText, queryByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');
  const tagNav = await findByLabelText('Tag filters');

  fireEvent.click(within(tagNav).getByText('linux'));
  fireEvent.click(within(tagNav).getByText('mirror'));

  // Only the torrent carrying BOTH tags survives.
  expect(within(tagNav).getByText('linux').closest('button')).toHaveClass('active');
  expect(within(tagNav).getByText('mirror').closest('button')).toHaveClass('active');
  expect(queryByText('archlinux-2026.05.01-x86_64.iso')).toBeInTheDocument();
  expect(queryByText('public-domain-documentary-collection')).toBeNull();
  expect(queryByText('nightly.build.assets.pack')).toBeNull();

  const stored = JSON.parse(window.localStorage.getItem('qbitctl.appState.v1'));
  expect(stored.tagFilters).toEqual(['linux', 'mirror']);
  expect(stored).not.toHaveProperty('tagFilter');

  // Adding a tag no torrent shares empties the list (AND, not OR).
  fireEvent.click(within(tagNav).getByText('archive'));
  expect(queryByText('archlinux-2026.05.01-x86_64.iso')).toBeNull();
  expect(queryByText('No torrents match this filter.')).toBeInTheDocument();

  // Toggling a selected tag off removes it from the filter set.
  fireEvent.click(within(tagNav).getByText('archive'));
  expect(queryByText('archlinux-2026.05.01-x86_64.iso')).toBeInTheDocument();
});

test('double-click excludes a tag and a single click returns it to neutral', async () => {
  const { findByLabelText, findByText, queryByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');
  const tagNav = await findByLabelText('Tag filters');
  const linuxButton = within(tagNav).getByText('linux').closest('button');

  fireBrowserDoubleClick(linuxButton);
  expect(linuxButton).toHaveClass('excluded');
  expect(linuxButton).not.toHaveClass('active');
  expect(queryByText('archlinux-2026.05.01-x86_64.iso')).toBeNull();
  expect(queryByText('nightly.build.assets.pack')).toBeInTheDocument();
  expect(JSON.parse(window.localStorage.getItem('qbitctl.appState.v1')).excludedTagFilters)
    .toEqual(['linux']);

  fireEvent.click(linuxButton);
  expect(linuxButton).not.toHaveClass('excluded');
  expect(linuxButton).not.toHaveClass('active');
  expect(queryByText('archlinux-2026.05.01-x86_64.iso')).toBeInTheDocument();

  fireEvent.click(linuxButton);
  expect(linuxButton).toHaveClass('active');
  expect(queryByText('archlinux-2026.05.01-x86_64.iso')).toBeInTheDocument();
  expect(queryByText('nightly.build.assets.pack')).toBeNull();
});

test('category exclusions can be combined and return to neutral on click', async () => {
  const { findByLabelText, findByText, queryByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');
  const categoryNav = await findByLabelText('Category filters');
  const linuxButton = within(categoryNav).getByText('linux').closest('button');
  const workButton = within(categoryNav).getByText('work').closest('button');

  fireBrowserDoubleClick(linuxButton);
  fireBrowserDoubleClick(workButton);
  expect(linuxButton).toHaveClass('excluded');
  expect(workButton).toHaveClass('excluded');
  expect(queryByText('archlinux-2026.05.01-x86_64.iso')).toBeNull();
  expect(queryByText('nightly.build.assets.pack')).toBeNull();
  expect(JSON.parse(window.localStorage.getItem('qbitctl.appState.v1')).excludedCategories)
    .toEqual(['linux', 'work']);

  fireEvent.click(linuxButton);
  expect(linuxButton).not.toHaveClass('excluded');
  expect(linuxButton).not.toHaveClass('active');
  expect(queryByText('archlinux-2026.05.01-x86_64.iso')).toBeInTheDocument();
  expect(queryByText('nightly.build.assets.pack')).toBeNull();

  fireEvent.click(linuxButton);
  expect(linuxButton).toHaveClass('active');
  expect(queryByText('archlinux-2026.05.01-x86_64.iso')).toBeInTheDocument();
  expect(queryByText('public-domain-documentary-collection')).toBeNull();
});

test('activity graph labels the Y axis with only the peak value', async () => {
  const { findByLabelText, findByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');
  const graph = await findByLabelText('Last hour speed graph');

  // Fixture totals peak at 11.8 MB/s down -> only the max label is shown.
  expect(within(graph).getByText('11M')).toBeInTheDocument();
  expect(within(graph).queryByText('5.6M')).toBeNull();
  expect(within(graph).queryByText('0')).toBeNull();
});

test('legacy persisted state migrates paused filter and single tag', async () => {
  window.localStorage.setItem(
    'qbitctl.appState.v1',
    JSON.stringify({ activeFilter: 'paused', tagFilter: 'linux' })
  );
  const { findByLabelText } = render(<App />);
  const nav = await findByLabelText('Torrent filters');
  expect(within(nav).getByText('Stopped').closest('button')).toHaveClass('active');
  const tagNav = await findByLabelText('Tag filters');
  expect(within(tagNav).getByText('linux').closest('button')).toHaveClass('active');

  const stored = JSON.parse(window.localStorage.getItem('qbitctl.appState.v1'));
  expect(stored.activeFilter).toBe('stopped');
  expect(stored.tagFilters).toEqual(['linux']);
  expect(stored).not.toHaveProperty('tagFilter');
});

test('details panel shows ETA for the selected torrent', async () => {
  const { findByText, getByText } = render(<App />);
  fireEvent.click(await findByText('archlinux-2026.05.01-x86_64.iso'));
  expect(getByText('ETA')).toBeInTheDocument();
  expect(getByText('22s')).toBeInTheDocument();
});

test('tracker rows expand to show the tracker response and reannounce action', async () => {
  const { findByText, getByText, queryByText } = render(<App />);
  fireEvent.click(await findByText('nightly.build.assets.pack'));

  expect(getByText('Reannounce')).toBeInTheDocument();
  expect(getByText('not working')).toBeInTheDocument();
  expect(queryByText('Connection timed out')).toBeNull();

  fireEvent.click(getByText('udp://tracker.internal.local:6969/announce'));
  expect(getByText('Connection timed out')).toBeInTheDocument();
  expect(getByText('Force reannounce')).toBeInTheDocument();

  // Clicking again collapses the row.
  fireEvent.click(getByText('udp://tracker.internal.local:6969/announce'));
  expect(queryByText('Connection timed out')).toBeNull();
});

function optInVersionCheck() {
  window.localStorage.setItem(
    'qbitctl.appState.v1',
    JSON.stringify({ settings: { ui_version_check_enabled: true } })
  );
}

function githubWasCalled() {
  return global.fetch.mock.calls.some(([url]) => String(url).includes('api.github.com'));
}

test('API failure shows the full disconnected page instead of preview torrents', async () => {
  global.fetch.mockImplementation(() => Promise.reject(new Error('offline')));
  const { container, findByText, queryByText } = render(<App />);

  expect(await findByText('Disconnected')).toBeInTheDocument();
  expect(container.querySelector('.disconnected-shell')).toBeInTheDocument();
  expect(container.querySelectorAll('.disconnected-signal span')).toHaveLength(3);
  expect(queryByText('archlinux-2026.05.01-x86_64.iso')).toBeNull();
  expect(global.fetch.mock.calls.some(([url]) => String(url).includes('ipify'))).toBe(false);
});

test('explicit preview mode shows sample torrents when the API is unavailable', async () => {
  vi.stubEnv('VITE_PREVIEW_MODE', 'true');
  global.fetch.mockImplementation(() => Promise.reject(new Error('offline')));
  const { findByText, queryByText } = render(<App />);

  expect(await findByText('archlinux-2026.05.01-x86_64.iso')).toBeInTheDocument();
  expect(queryByText('Disconnected')).toBeNull();
});

test('version check is opt-in: no button and no GitHub call by default', async () => {
  const { findByText, getByLabelText, getByText, queryByTitle } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');

  expect(queryByTitle('Version details')).toBeNull();
  expect(githubWasCalled()).toBe(false);

  // Opting in via settings shows the button and triggers the (single) check.
  fireEvent.click(getByLabelText('Settings'));
  const toggle = getByText('Version update check').closest('label').querySelector('input');
  fireEvent.click(toggle);
  expect(queryByTitle('Version details')).toBeInTheDocument();
  expect(githubWasCalled()).toBe(true);
});

test('version button opens the version modal when opted in', async () => {
  optInVersionCheck();
  const { findByText, getByText, getByTitle, queryByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');

  // The old connection-state block is gone.
  expect(queryByText('live')).toBeNull();

  const button = getByTitle('Version details');
  expect(button).toHaveTextContent('v1.2.0');
  expect(button).not.toHaveClass('update-available');

  fireEvent.click(button);
  expect(getByText('WebUI version')).toBeInTheDocument();
  expect(getByText('qBittorrent')).toBeInTheDocument();
  expect(getByText('No release notes available.')).toBeInTheDocument();
  expect(getByText('Could not reach GitHub to check for updates.')).toBeInTheDocument();
});

test('version button highlights an available update with changelog and link', async () => {
  optInVersionCheck();
  mockFetchWithLatestRelease({
    tag_name: 'v9.9.9',
    body: 'Big new things',
    html_url: 'https://github.com/mstraa/qbitctl-webui/releases/tag/v9.9.9',
  });
  const { findByText, getByText, getByTitle } = render(<App />);

  await findByText('⇡ v9.9.9');
  expect(getByTitle('Update available: v9.9.9')).toHaveClass('update-available');

  fireEvent.click(getByTitle('Update available: v9.9.9'));
  expect(getByText('Changelog v9.9.9')).toBeInTheDocument();
  expect(getByText('Big new things')).toBeInTheDocument();
  expect(getByText('Update available: v9.9.9')).toBeInTheDocument();
  const link = getByText('Open release on GitHub');
  expect(link).toHaveAttribute('href', 'https://github.com/mstraa/qbitctl-webui/releases/tag/v9.9.9');
});

test('matching latest release keeps the version button gray', async () => {
  optInVersionCheck();
  mockFetchWithLatestRelease({
    tag_name: 'v1.2.0',
    body: 'Current release',
    html_url: 'https://github.com/mstraa/qbitctl-webui/releases/tag/v1.2.0',
  });
  const { findByText, getByTitle } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');

  const button = getByTitle('Version details');
  expect(button).not.toHaveClass('update-available');
  fireEvent.click(button);
  expect(await findByText('You are on the latest version.')).toBeInTheDocument();
});

function mockAuthenticatedApi() {
  const state = { authed: false };
  global.fetch.mockImplementation((url, options) => {
    const u = String(url);
    if (u.includes('/api/v2/auth/login')) {
      const body = String(options && options.body);
      state.authed = body.includes('password=goodpass');
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(state.authed ? 'Ok.' : 'Fails.'),
      });
    }
    if (u.includes('/api/v2/auth/logout')) {
      state.authed = false;
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') });
    }
    if (u.includes('/api/v2/torrents/info')) {
      return state.authed
        ? Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([{
              hash: 'live1', name: 'live-torrent', state: 'downloading', progress: 0.5,
              dlspeed: 100, upspeed: 10, size: 1000, downloaded: 500, uploaded: 100,
              ratio: 0.1, num_seeds: 1, num_leechs: 1, category: '', save_path: '/data',
              tags: '', added_on: 1700000000, completion_on: 0, eta: 60,
            }]),
          })
        : Promise.resolve({ ok: false, status: 403, json: () => Promise.resolve({}) });
    }
    return Promise.reject(new Error('offline'));
  });
  return state;
}

test('shows the login page when qBittorrent requires authentication', async () => {
  mockAuthenticatedApi();
  const { findByText, getByLabelText, queryByText } = render(<App />);

  expect(await findByText('qBittorrent WebUI login')).toBeInTheDocument();
  expect(getByLabelText('Username')).toBeInTheDocument();
  expect(getByLabelText('Password')).toBeInTheDocument();
  // No preview fallback while authentication is pending.
  expect(queryByText('archlinux-2026.05.01-x86_64.iso')).toBeNull();
});

test('rejected credentials show an error, valid ones enter live mode, logout returns to login', async () => {
  mockAuthenticatedApi();
  const { findByText, getByLabelText, getByText } = render(<App />);
  await findByText('qBittorrent WebUI login');

  // Wrong password -> error message, still on the login page.
  fireEvent.change(getByLabelText('Username'), { target: { value: 'admin' } });
  fireEvent.change(getByLabelText('Password'), { target: { value: 'badpass' } });
  fireEvent.click(getByText('Log in'));
  expect(await findByText('Invalid username or password.')).toBeInTheDocument();

  // Correct password -> live torrents replace the login page.
  fireEvent.change(getByLabelText('Password'), { target: { value: 'goodpass' } });
  fireEvent.click(getByText('Log in'));
  expect(await findByText('live-torrent')).toBeInTheDocument();

  // Logout from settings returns to the login page.
  fireEvent.click(getByLabelText('Settings'));
  fireEvent.click(getByText('Log out of qBittorrent'));
  expect(await findByText('qBittorrent WebUI login')).toBeInTheDocument();
});

test('queue column shows positions and a dash for unqueued torrents', async () => {
  const { findByText, getByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');

  expect(getByText('#')).toBeInTheDocument();

  const archRow = getByText('archlinux-2026.05.01-x86_64.iso').closest('.torrent-row');
  expect(within(archRow).getByText('1')).toBeInTheDocument();
  expect(within(archRow).getByLabelText('Move up in queue')).toBeDisabled();
  expect(within(archRow).getByLabelText('Move down in queue')).toBeEnabled();

  // Bottom of the queue (3 of 3) -> down is disabled.
  const refRow = getByText('reference-dataset-v14.tar.zst').closest('.torrent-row');
  expect(within(refRow).getByText('3')).toBeInTheDocument();
  expect(within(refRow).getByLabelText('Move down in queue')).toBeDisabled();

  // Seeding torrent is not queued: dash, no chevrons.
  const seedRow = getByText('public-domain-documentary-collection').closest('.torrent-row');
  expect(within(seedRow).getByText('-')).toBeInTheDocument();
  expect(within(seedRow).queryByLabelText('Move up in queue')).toBeNull();
  expect(within(seedRow).queryByLabelText('Move down in queue')).toBeNull();
});

test('queue chevrons do not select the row', async () => {
  const { container, findByText, getByText, queryByText } = render(<App />);
  await findByText('nightly.build.assets.pack');

  const row = getByText('nightly.build.assets.pack').closest('.torrent-row');
  fireEvent.click(within(row).getByLabelText('Move up in queue'));

  expect(container.querySelector('.torrent-row.selected')).toBeNull();
  expect(queryByText('ETA')).toBeNull();
});

test('sorting by # orders the queue and sinks unqueued torrents', async () => {
  const { container, findByText, getByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');

  fireEvent.click(getByText('#'));
  const names = Array.from(container.querySelectorAll('.torrent-name strong')).map(node => node.textContent);
  expect(names).toEqual([
    'archlinux-2026.05.01-x86_64.iso',
    'nightly.build.assets.pack',
    'reference-dataset-v14.tar.zst',
    'public-domain-documentary-collection',
  ]);
});

test('queue column can be hidden from settings', async () => {
  const { container, findByText, getByLabelText, getByText, queryByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');
  expect(container.querySelector('.queue-cell')).toBeInTheDocument();

  fireEvent.click(getByLabelText('Settings'));
  const toggle = getByText('Queue column').closest('label').querySelector('input');
  fireEvent.click(toggle);

  expect(container.querySelector('.queue-cell')).toBeNull();
  expect(queryByText('#')).toBeNull();
  const stored = JSON.parse(window.localStorage.getItem('qbitctl.appState.v1'));
  expect(stored.settings.ui_show_queue_column).toBe(false);
});

function mockLiveQueueApi() {
  const base = {
    progress: 0.4, dlspeed: 100, upspeed: 0, size: 1000, downloaded: 400,
    uploaded: 0, ratio: 0, num_seeds: 1, num_leechs: 1, category: '',
    save_path: '/data', tags: '', added_on: 1700000000, completion_on: 0, eta: 60,
  };
  global.fetch.mockImplementation(url => {
    const u = String(url);
    if (u.includes('/api/v2/torrents/info')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([
          { ...base, hash: 'live1', name: 'live-one', state: 'downloading', priority: 1 },
          { ...base, hash: 'live2', name: 'live-two', state: 'queuedDL', priority: 2 },
        ]),
      });
    }
    if (u.includes('/api/v2/torrents/increasePrio') || u.includes('/api/v2/torrents/decreasePrio')) {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') });
    }
    return Promise.reject(new Error('offline'));
  });
}

test('queue chevrons call the qBittorrent priority API in live mode', async () => {
  mockLiveQueueApi();
  const { findByText } = render(<App />);
  const row = (await findByText('live-two')).closest('.torrent-row');

  fireEvent.click(within(row).getByLabelText('Move up in queue'));

  const call = global.fetch.mock.calls.find(([url]) => String(url).includes('/api/v2/torrents/increasePrio'));
  expect(call).toBeTruthy();
  expect(String(call[1].body)).toBe('hashes=live2');
  // Optimistic swap shows the new position before the next poll.
  expect(within(row).getByText('1')).toBeInTheDocument();
});

test('Alt+Arrow on a focused row moves it in the queue', async () => {
  mockLiveQueueApi();
  const { findByText } = render(<App />);
  const row = (await findByText('live-one')).closest('.torrent-row');

  fireEvent.keyDown(row, { altKey: true, key: 'ArrowDown' });

  const call = global.fetch.mock.calls.find(([url]) => String(url).includes('/api/v2/torrents/decreasePrio'));
  expect(call).toBeTruthy();
  expect(String(call[1].body)).toBe('hashes=live1');
});

test('hiding the queue column resets an active # sort to name', async () => {
  const { container, findByText, getByLabelText, getByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');

  fireEvent.click(getByText('#'));
  fireEvent.click(getByLabelText('Settings'));
  fireEvent.click(getByText('Queue column').closest('label').querySelector('input'));

  const stored = JSON.parse(window.localStorage.getItem('qbitctl.appState.v1'));
  expect(stored.sort.key).toBe('name');
  const names = Array.from(container.querySelectorAll('.torrent-name strong')).map(node => node.textContent);
  expect(names[0]).toBe('archlinux-2026.05.01-x86_64.iso');
});

test('Stop All and Resume All target every torrent in live mode', async () => {
  mockLiveQueueApi();
  global.fetch.mockImplementation((original => url => {
    const u = String(url);
    if (u.includes('/api/v2/torrents/stop') || u.includes('/api/v2/torrents/start')) {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') });
    }
    return original(url);
  })(global.fetch.getMockImplementation()));
  const { findByLabelText, findByText } = render(<App />);
  await findByText('live-one');
  const toolbar = await findByLabelText('Torrent actions');

  fireEvent.click(within(toolbar).getByText('Stop All'));
  fireEvent.click(within(toolbar).getByText('Resume All'));

  const stop = global.fetch.mock.calls.find(([url]) => String(url).includes('/api/v2/torrents/stop'));
  const start = global.fetch.mock.calls.find(([url]) => String(url).includes('/api/v2/torrents/start'));
  expect(String(stop[1].body)).toBe('hashes=all');
  expect(String(start[1].body)).toBe('hashes=all');
});

test('size column is off by default and can be enabled from settings', async () => {
  const { container, findByText, getByLabelText, getByText, queryByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');
  expect(container.querySelector('.size-cell')).toBeNull();
  expect(queryByText('Size')).toBeNull();

  fireEvent.click(getByLabelText('Settings'));
  fireEvent.click(getByText('Size column').closest('label').querySelector('input'));

  expect(container.querySelectorAll('.size-cell')).toHaveLength(SAMPLE_TORRENTS.length);
  const stored = JSON.parse(window.localStorage.getItem('qbitctl.appState.v1'));
  expect(stored.settings.ui_show_size_column).toBe(true);
});

test('ratio shows under the progress percentage and stays sortable', async () => {
  const { container, findByText, getByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');

  const ratios = Array.from(container.querySelectorAll('.progress-cell .ratio-value'))
    .map(node => node.textContent);
  expect(ratios).toHaveLength(SAMPLE_TORRENTS.length);

  fireEvent.click(getByText('Ratio'));
  const sorted = Array.from(container.querySelectorAll('.progress-cell .ratio-value'))
    .map(node => Number(node.textContent));
  expect(sorted).toEqual([...sorted].sort((a, b) => a - b));
});

test('command row shows the filtered count, with the selection when there is one', async () => {
  const { container, findByText, getByLabelText, getByText } = render(<App />);
  const row = (await findByText('archlinux-2026.05.01-x86_64.iso')).closest('.torrent-row');
  const status = () => container.querySelector('.command-row > span').textContent;
  expect(status()).toBe(`${SAMPLE_TORRENTS.length} filtered`);

  fireEvent.change(getByLabelText('grep'), { target: { value: 'archlinux' } });
  expect(status()).toBe('1 filtered');

  fireEvent.click(row);
  expect(status()).toBe('1 selected / 1 filtered');
  expect(getByText('1 selected / 1 filtered')).toBeInTheDocument();
});

test('add modal accepts multiple torrent files and tags', async () => {
  const { findByLabelText, findByText, getByLabelText, getByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');
  const toolbar = await findByLabelText('Torrent actions');
  fireEvent.click(within(toolbar).getByText('ADD'));

  expect(getByText('Add torrents')).toBeInTheDocument();
  expect(getByText('Torrent files').closest('label').querySelector('input[type="file"]'))
    .toHaveAttribute('multiple');
  // English trigger replaces the browser-locale native file widget.
  expect(getByText('Browse files')).toBeInTheDocument();
  expect(getByText('Tags').closest('label').querySelector('input[type="text"]')).toBeInTheDocument();
  expect(getByText('Add stopped')).toBeInTheDocument();

  // Quick-tags from existing torrents are offered in the add modal.
  const quickTags = getByLabelText('Existing tags');
  fireEvent.click(within(quickTags).getByText('linux'));
  expect(getByText('Tags').closest('label').querySelector('input[type="text"]').value).toBe('linux');
});
