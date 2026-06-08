import { fireEvent, render, within } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  window.localStorage.clear();
  vi.stubEnv('VITE_APP_VERSION', '1.2.0');
  // Default: no network at all -> the app falls back to preview mode and the
  // GitHub release check stays unresolved. Tests override this when needed.
  vi.spyOn(global, 'fetch').mockImplementation(() => Promise.reject(new Error('offline')));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function mockFetchWithLatestRelease(release) {
  global.fetch.mockImplementation(url =>
    String(url).includes('api.github.com')
      ? Promise.resolve({ ok: true, json: () => Promise.resolve(release) })
      : Promise.reject(new Error('offline'))
  );
}

test('renders qbitctl shell', () => {
  const { getByText } = render(<App />);
  const headingElement = getByText(/qbitctl/i);
  expect(headingElement).toBeInTheDocument();
});

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

test('activity graph labels the Y axis with only the peak value', async () => {
  const { findByLabelText, findByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');
  const graph = await findByLabelText('Last hour speed graph');

  // Preview totals peak at 11.8 MB/s down -> only the max label is shown.
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

test('preview mode shows an IP placeholder and never calls third-party IP services', async () => {
  const { findByText, getByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');

  expect(getByText('xxx.xxx.xxx.xxx')).toBeInTheDocument();
  expect(global.fetch.mock.calls.some(([url]) => String(url).includes('ipify'))).toBe(false);
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

  // The old "live/preview" connection block is gone.
  expect(queryByText('preview')).toBeNull();

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

test('queue chevrons do not select the row and stay local in preview mode', async () => {
  const { container, findByText, getByText, queryByText } = render(<App />);
  await findByText('nightly.build.assets.pack');

  const row = getByText('nightly.build.assets.pack').closest('.torrent-row');
  fireEvent.click(within(row).getByLabelText('Move up in queue'));

  expect(container.querySelector('.torrent-row.selected')).toBeNull();
  expect(queryByText('ETA')).toBeNull();
  expect(global.fetch.mock.calls.some(([url]) => String(url).includes('Prio'))).toBe(false);
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
