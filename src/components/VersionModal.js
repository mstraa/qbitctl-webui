import React from 'react';
import { GITHUB_REPO } from '../lib/constants';
import { overlayClose } from './common';

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

export default VersionModal;
