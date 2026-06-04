# qbitctl

Dark, terminal-inspired qBittorrent WebUI built with React. The interface keeps the qBittorrent API surface close at hand while using a grey scale palette, orange accent, dense torrent rows, sortable columns, tag filters, quick tag editing, settings, and add-torrent workflows.

![qbitctl main torrent view](docs/screenshot-main.png)

## Screenshots

### Add Torrent

![qbitctl add torrent modal](docs/screenshot-add.png)

### Quick Tag Editing

![qbitctl tag editor](docs/screenshot-tags.png)

### Settings

![qbitctl settings panel](docs/screenshot-settings.png)

## Features

- Custom dark qBittorrent WebUI with configurable accent color.
- Torrent filters for all, active, downloading, seeding, stopped, and stalled, plus category filters and multi-select tag filters (torrents must match every selected tag) with counts.
- Sortable torrent table with status, progress, speed, ratio, and added date, with a sticky header and toolbar.
- Multi-select with Shift, Cmd, or Ctrl for resume, stop, recheck, and remove actions.
- Remove confirmation modal with an optional `Delete downloaded data` checkbox.
- Add modal accepting multiple `.torrent` files and magnet/URL paste, with tags at add time and an `Add stopped` option for import workflows (add stopped, recheck, then resume).
- Selected torrent panel with ETA, files, peers, save path, category, and quick tag editing.
- Tracker list with per-tracker status; click a tracker to expand its latest response message and force a reannounce.
- Settings modal with qBittorrent preferences, advanced settings, compact mode, ratio progress toggle, and default WebUI revert action.
- UI state (filters, search, sort, and appearance settings) persists across sessions in browser local storage.
- Modals close on backdrop click.
- Compatible with old and new qBittorrent API endpoints (`torrents/start` with fallback to `torrents/resume`).
- Release pipeline that builds `build/public`, wraps it as `qbitctl-<version>/public/`, and uploads `qbitctl-<version>.zip` plus a stable-URL `qbitctl-latest.zip`.

## Install From A Release

Every release ships a versioned `qbitctl-<version>.zip` plus a fixed-name `qbitctl-latest.zip` that extracts to a stable `qbitctl-latest/` folder. The latest zip is always available at the same URL, so installing and updating is the same two commands:

```bash
curl -fL -o qbitctl-latest.zip \
  https://github.com/mstraa/qbitctl-webui/releases/latest/download/qbitctl-latest.zip
rm -rf /opt/qbittorrent-webuis/qbitctl-latest && \
  unzip -q qbitctl-latest.zip -d /opt/qbittorrent-webuis
```

First-time setup:

1. Run the commands above (pick any folder qBittorrent can read instead of `/opt/qbittorrent-webuis`).
2. In qBittorrent, open `Tools -> Options -> Web UI`.
3. Enable `Use alternative WebUI`.
4. Set the WebUI path to the extracted `qbitctl-latest/public` folder (or `qbitctl-<version>/public` if you prefer pinned versions).
5. Apply the settings and reload the qBittorrent WebUI.

To update later, just re-run the curl + unzip commands and reload the WebUI — the path stays the same.

To revert, open qbitctl settings and use `Revert to default qBittorrent WebUI`, or disable `Use alternative WebUI` in qBittorrent.

## Build It Yourself

### Requirements

- Node 18 (the version used by CI; anything from Node 17 up needs the legacy OpenSSL flag shown below because of the older Webpack 4 stack)
- Yarn 1.x (classic)

### Setup

```bash
git clone https://github.com/mstraa/qbitctl.git
cd qbitctl
yarn install --frozen-lockfile
```

### Local development

```bash
NODE_OPTIONS=--openssl-legacy-provider yarn start
```

This starts the dev server on `http://localhost:3000` (set `PORT` to change it). Without a reachable qBittorrent API the UI falls back to built-in preview data, so you can develop the interface without a running qBittorrent instance.

Run the tests with:

```bash
yarn test --watchAll=false
```

### Build and package

```bash
NODE_OPTIONS=--openssl-legacy-provider yarn build
yarn package:release
```

`yarn build` outputs the WebUI to `build/public`. `yarn package:release` wraps it and creates:

```text
dist/qbitctl-<version>.zip
dist/qbitctl-latest.zip
```

The version defaults to the one in `package.json`; pass one explicitly with `yarn package:release 1.1.0`. Each zip contains a top-level folder (`qbitctl-<version>/` or `qbitctl-latest/`) with the built WebUI under `public/`. Point qBittorrent's alternative WebUI path at that `public` folder (see [Install From A Release](#install-from-a-release)).

## Release Pipeline

The GitHub Actions workflow in `.github/workflows/release.yml` runs tests, builds the WebUI, packages `build/public`, and uploads both `qbitctl-<version>.zip` and `qbitctl-latest.zip`. Tagged releases are marked as the latest release, so the `releases/latest/download/qbitctl-latest.zip` URL always serves the newest version.

Create a release by pushing a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow can also be run manually from GitHub Actions with an optional version input. Manual runs upload the zip as a workflow artifact. Tagged runs also publish it to the GitHub release.

## qBittorrent API Notes

qbitctl expects to be served by qBittorrent as an alternative WebUI. Live mode uses the same-origin qBittorrent API endpoints under `/api/v2/*`. When run locally with `yarn start`, it falls back to preview data when the qBittorrent API is not available.

## Privacy

The repository does not include personal IP addresses, tokens, qBittorrent credentials, or local configuration files. Runtime values such as external IP and free space are fetched dynamically in the browser and are not stored in the source tree.

---

Based on `ntoporcov/qbittorrent-webui-react-boilerplate`.
