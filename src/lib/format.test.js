import {
  formatAxisSpeed,
  formatBytes,
  formatDateShort,
  formatEta,
  formatPercent,
  formatRatio,
  formatSpeed,
  formatTimestamp,
  isNewerVersion,
} from './format';

test('formatBytes scales units and trims precision above 10', () => {
  expect(formatBytes(0)).toBe('0 B');
  expect(formatBytes(undefined)).toBe('0 B');
  expect(formatBytes(512)).toBe('512 B');
  expect(formatBytes(1536)).toBe('1.5 KB');
  expect(formatBytes(10240)).toBe('10 KB');
  expect(formatBytes(1073741824)).toBe('1.0 GB');
  expect(formatBytes(945000000)).toBe('901 MB');
});

test('formatRatio always shows two decimals', () => {
  expect(formatRatio(0.473)).toBe('0.47');
  expect(formatRatio(3.918)).toBe('3.92');
  expect(formatRatio(undefined)).toBe('0.00');
  expect(formatRatio(0)).toBe('0.00');
});

test('formatSpeed appends /s to byte values', () => {
  expect(formatSpeed(0)).toBe('0 B/s');
  expect(formatSpeed(1536)).toBe('1.5 KB/s');
});

test('formatAxisSpeed compacts values for the graph axis', () => {
  expect(formatAxisSpeed(0)).toBe('0');
  expect(formatAxisSpeed(0.4)).toBe('0');
  expect(formatAxisSpeed(1536)).toBe('1.5K');
  expect(formatAxisSpeed(460800)).toBe('450K');
  expect(formatAxisSpeed(11800000)).toBe('11M');
});

test('formatEta renders the two most significant units', () => {
  expect(formatEta(22)).toBe('22s');
  expect(formatEta(90)).toBe('1m 30s');
  expect(formatEta(3700)).toBe('1h 1m');
  expect(formatEta(90061)).toBe('1d 1h');
});

test('formatEta shows infinity for unknown ETAs', () => {
  // qBittorrent reports 8640000 when the ETA is unknown.
  expect(formatEta(8640000)).toBe('∞');
  expect(formatEta(9999999)).toBe('∞');
  expect(formatEta(-5)).toBe('∞');
  expect(formatEta('not a number')).toBe('∞');
});

test('formatPercent rounds fractions to whole percent', () => {
  expect(formatPercent(0.73)).toBe('73%');
  expect(formatPercent(1)).toBe('100%');
  expect(formatPercent(undefined)).toBe('0%');
});

test('date formatters show -- for missing timestamps', () => {
  expect(formatDateShort(0)).toBe('--');
  expect(formatTimestamp(0)).toBe('--');
  // Locale-dependent output: compare against the same Date APIs.
  expect(formatDateShort(1700000000)).toBe(new Date(1700000000000).toLocaleDateString());
  expect(formatTimestamp(1700000000)).toBe(new Date(1700000000000).toLocaleString());
});

test('isNewerVersion compares versions numerically per segment', () => {
  expect(isNewerVersion('1.3.0', '1.2.9')).toBe(true);
  expect(isNewerVersion('1.10.0', '1.9.0')).toBe(true);
  expect(isNewerVersion('2.0', '1.9.9')).toBe(true);
  expect(isNewerVersion('1.2.0', '1.2.0')).toBe(false);
  expect(isNewerVersion('1.2', '1.2.0')).toBe(false);
  expect(isNewerVersion('1.1.9', '1.2.0')).toBe(false);
  expect(isNewerVersion('', '1.0.0')).toBe(false);
  expect(isNewerVersion('1.0.0', '')).toBe(false);
});
