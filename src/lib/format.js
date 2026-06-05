export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatRatio(ratio) {
  return Number(ratio || 0).toFixed(2);
}

export function formatSpeed(bytes) {
  return `${formatBytes(bytes)}/s`;
}

// Compact byte/s label for the activity graph axis, e.g. "11M" or "450K".
export function formatAxisSpeed(bytes) {
  if (!bytes || bytes < 1) {
    return '0';
  }
  const units = ['B', 'K', 'M', 'G', 'T'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)}${units[exponent]}`;
}

// qBittorrent reports 8640000 seconds (100 days) when the ETA is unknown/infinite.
const ETA_INFINITY = 8640000;

export function formatEta(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0 || value >= ETA_INFINITY) {
    return '∞';
  }
  const days = Math.floor(value / 86400);
  const hours = Math.floor((value % 86400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = Math.floor(value % 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function formatPercent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

export function formatDateShort(seconds) {
  if (!seconds) return '--';
  return new Date(seconds * 1000).toLocaleDateString();
}

export function formatTimestamp(seconds) {
  if (!seconds) return '--';
  return new Date(seconds * 1000).toLocaleString();
}

export function isNewerVersion(candidate, current) {
  if (!candidate || !current) {
    return false;
  }
  const a = String(candidate).split('.').map(Number);
  const b = String(current).split('.').map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const left = Number.isFinite(a[index]) ? a[index] : 0;
    const right = Number.isFinite(b[index]) ? b[index] : 0;
    if (left > right) return true;
    if (left < right) return false;
  }
  return false;
}
