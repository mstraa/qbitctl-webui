import React from 'react';
import { FILTERS } from '../lib/constants';
import { formatBytes } from '../lib/format';
import { countForFilter, parseTags } from '../lib/torrents';
import { SpeedValue } from './common';
import SpeedHistoryGraph from './SpeedHistoryGraph';

function Sidebar({
  activeFilter,
  appVersion,
  categories,
  categoryFilter,
  latestRelease,
  onCategoryFilter,
  onFilter,
  onOpenVersion,
  onResetTagFilters,
  onToggleTag,
  sessionInfo,
  settings,
  speedHistory,
  tagFilters,
  tags,
  torrents,
  totals,
  updateAvailable,
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="prompt-mark">qb</span>
        <div>
          <h1>qbitctl</h1>
          <p>p2p lover's dashboard</p>
        </div>
      </div>

      {Boolean(settings.ui_version_check_enabled) && (
        <button
          className={`version-button ${updateAvailable ? 'update-available' : ''}`}
          onClick={onOpenVersion}
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
            onClick={() => onFilter(filter.key)}
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
            onClick={() => onCategoryFilter('')}
            type="button"
          >
            <span>All categories</span>
            <strong>{torrents.length}</strong>
          </button>
          {categories.map(category => (
            <button
              className={category === categoryFilter ? 'active' : ''}
              key={category}
              onClick={() => onCategoryFilter(category)}
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
            onClick={onResetTagFilters}
            type="button"
          >
            <span>All tags</span>
            <strong>{torrents.length}</strong>
          </button>
          {tags.map(tag => (
            <button
              className={tagFilters.includes(tag) ? 'active' : ''}
              key={tag}
              onClick={() => onToggleTag(tag)}
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
  );
}

export default Sidebar;
