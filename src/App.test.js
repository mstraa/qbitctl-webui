import React from 'react';
import { fireEvent, render, within } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  window.localStorage.clear();
});

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

test('tag filters support multi-select with OR matching', async () => {
  const { findByLabelText, findByText, queryByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');
  const tagNav = await findByLabelText('Tag filters');

  fireEvent.click(within(tagNav).getByText('linux'));
  fireEvent.click(within(tagNav).getByText('archive'));

  expect(within(tagNav).getByText('linux').closest('button')).toHaveClass('active');
  expect(within(tagNav).getByText('archive').closest('button')).toHaveClass('active');
  expect(queryByText('archlinux-2026.05.01-x86_64.iso')).toBeInTheDocument();
  expect(queryByText('public-domain-documentary-collection')).toBeInTheDocument();
  expect(queryByText('nightly.build.assets.pack')).toBeNull();

  const stored = JSON.parse(window.localStorage.getItem('qbitctl.appState.v1'));
  expect(stored.tagFilters).toEqual(['linux', 'archive']);
  expect(stored).not.toHaveProperty('tagFilter');

  // Toggling a selected tag off removes it from the filter set.
  fireEvent.click(within(tagNav).getByText('archive'));
  expect(queryByText('public-domain-documentary-collection')).toBeNull();
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

test('add modal accepts multiple torrent files and tags', async () => {
  const { findByLabelText, findByText, getByLabelText, getByText } = render(<App />);
  await findByText('archlinux-2026.05.01-x86_64.iso');
  const toolbar = await findByLabelText('Torrent actions');
  fireEvent.click(within(toolbar).getByText('ADD'));

  expect(getByText('Add torrents')).toBeInTheDocument();
  expect(getByText('Torrent files').closest('label').querySelector('input[type="file"]'))
    .toHaveAttribute('multiple');
  expect(getByText('Tags').closest('label').querySelector('input[type="text"]')).toBeInTheDocument();
  expect(getByText('Add stopped')).toBeInTheDocument();

  // Quick-tags from existing torrents are offered in the add modal.
  const quickTags = getByLabelText('Existing tags');
  fireEvent.click(within(quickTags).getByText('linux'));
  expect(getByText('Tags').closest('label').querySelector('input[type="text"]').value).toBe('linux');
});
