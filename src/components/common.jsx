import { formatBytes } from '../lib/format';
import { formatStatus, statusTone } from '../lib/torrents';

export function overlayClose(event, onClose) {
  if (event.target === event.currentTarget) {
    onClose();
  }
}

export function StatusBadge({ torrent }) {
  return <span className={`status-badge ${statusTone(torrent)}`}>{formatStatus(torrent)}</span>;
}

export function ProgressBar({ value, large }) {
  return (
    <span className={`progress-track ${large ? 'large' : ''}`}>
      <span style={{ width: `${Math.round(value * 100)}%` }} />
    </span>
  );
}

export function SpeedValue({ bytes }) {
  const [value, unit = 'B'] = formatBytes(bytes).split(' ');
  return (
    <span className="speed-value">
      <span>{value}</span>
      <small>{unit}/s</small>
    </span>
  );
}
