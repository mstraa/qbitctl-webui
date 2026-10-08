import { formatBytes, formatDateShort, formatRatio, formatSpeed } from '../lib/format';
import { formatNameMeta, formatSeedPeerCount, formatStatus } from '../lib/torrents';
import { ProgressBar, StatusBadge } from './common';

function TorrentTable({
  columns,
  maxQueuePriority,
  onMoveInQueue,
  onRowClick,
  onRowKeyDown,
  onRowKeyUp,
  onSort,
  selectedHashes,
  showQueueColumn,
  showRatioProgress,
  sort,
  torrents,
}) {
  const showSizeColumn = columns.some(column => column.key === 'size');
  const showSeedsColumn = columns.some(column => column.key === 'seeds');
  const gap = 12;
  const padding = 28;
  const tableStyle = {
    '--table-columns': columns.map(column => column.width).join(' '),
    '--table-min-width': `${columns.reduce((sum, column) => sum + column.minWidth, 0) + gap * (columns.length - 1) + padding}px`,
  };

  function sortButton(key, label) {
    return (
      <button key={key} onClick={() => onSort(key)} type="button">
        <span>{label}</span>
        <strong>{sort.key === key ? sort.direction : ''}</strong>
      </button>
    );
  }

  return (
    <section className="torrent-table" aria-label="Torrent list" style={tableStyle}>
      <div className="table-head">
        {columns.map(column => (column.secondary ? (
          <span className="head-pair" key={column.key}>
            {sortButton(column.key, column.label)}
            {sortButton(column.secondary.key, column.secondary.label)}
          </span>
        ) : sortButton(column.key, column.label)))}
      </div>

      {torrents.map(torrent => {
        const selected = selectedHashes.includes(torrent.hash);
        return (
          <div
            aria-keyshortcuts={showQueueColumn && torrent.priority > 0 ? 'Alt+ArrowUp Alt+ArrowDown' : undefined}
            aria-label={`${torrent.name}, ${formatStatus(torrent)}`}
            className={`torrent-row ${selected ? 'selected' : ''}`}
            key={torrent.hash}
            onClick={event => onRowClick(event, torrent)}
            onKeyDown={event => onRowKeyDown(event, torrent)}
            onKeyUp={event => onRowKeyUp(event, torrent)}
            role="button"
            tabIndex={0}
          >
            {showQueueColumn && (
              <span className="queue-cell">
                {torrent.priority > 0 ? (
                  <>
                    <button
                      aria-label="Move up in queue"
                      disabled={torrent.priority <= 1}
                      onClick={event => {
                        event.stopPropagation();
                        onMoveInQueue(torrent, 'up');
                      }}
                      tabIndex={-1}
                      title="Move up in queue (Alt+↑ on the focused row)"
                      type="button"
                    >
                      ∧
                    </button>
                    <strong>{torrent.priority}</strong>
                    <button
                      aria-label="Move down in queue"
                      disabled={torrent.priority >= maxQueuePriority}
                      onClick={event => {
                        event.stopPropagation();
                        onMoveInQueue(torrent, 'down');
                      }}
                      tabIndex={-1}
                      title="Move down in queue (Alt+↓ on the focused row)"
                      type="button"
                    >
                      ∨
                    </button>
                  </>
                ) : (
                  <strong className="queue-none">-</strong>
                )}
              </span>
            )}
            <span className="torrent-name">
              <strong>{torrent.name}</strong>
              <small>{formatNameMeta(torrent)}</small>
            </span>
            <span><StatusBadge torrent={torrent} /></span>
            {showSizeColumn && <span className="size-cell">{formatBytes(torrent.size)}</span>}
            <span className="progress-cell">
              <ProgressBar value={torrent.progress} />
              <small>{Math.round(torrent.progress * 100)}%</small>
              {showRatioProgress && torrent.ratio > 0 && (
                <span className="ratio-progress" style={{ width: `${Math.min(torrent.ratio, 1) * 100}%` }} />
              )}
              <small className="ratio-value" title="Ratio">{formatRatio(torrent.ratio)}</small>
            </span>
            <span>{formatSpeed(torrent.dlspeed)}</span>
            <span>{formatSpeed(torrent.upspeed)}</span>
            {showSeedsColumn && <span className="seeds-cell">{formatSeedPeerCount(torrent)}</span>}
            <span>{formatDateShort(torrent.added_on)}</span>
          </div>
        );
      })}

      {!torrents.length && <div className="empty-state">No torrents match this filter.</div>}
    </section>
  );
}

export default TorrentTable;
