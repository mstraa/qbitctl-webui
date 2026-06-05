import React, { useState } from 'react';
import { formatBytes, formatEta, formatRatio, formatSpeed, formatTimestamp } from '../lib/format';
import {
  formatSeedPeerCount,
  formatStatus,
  formatTrackerCounts,
  getFiles,
  getPeers,
  getTrackers,
  parseTags,
  trackerStatusLabel,
  trackerStatusTone,
} from '../lib/torrents';
import { ProgressBar } from './common';

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

export default SelectedPanel;
