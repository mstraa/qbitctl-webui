import { formatAxisSpeed } from '../lib/format';

function SpeedHistoryGraph({ history }) {
  const dataMax = Math.max(
    0,
    ...history.map(point => Math.max(point.down || 0, point.up || 0))
  );
  const max = Math.max(1, dataMax);
  const downPath = buildLinePath(history.map(point => point.down || 0), max);
  const upPath = buildLinePath(history.map(point => point.up || 0), max);

  return (
    <section className="speed-history" aria-label="Last hour speed graph">
      <header>
        <span>Activity</span>
      </header>
      <div className="speed-plot">
        <svg viewBox="0 0 100 38" preserveAspectRatio="none" role="img">
          {/* Grid lines sit at max (y=2), max/2 (y=18), and 0 (y=34) to match the axis labels. */}
          <path className="grid-line" d="M0 2 H100 M0 18 H100 M0 34 H100" />
          <path className="up-line" d={upPath} />
          <path className="down-line" d={downPath} />
        </svg>
        <div className="speed-axis" aria-hidden="true">
          <span style={{ top: `${(2 / 38) * 100}%` }}>{dataMax ? formatAxisSpeed(dataMax) : '--'}</span>
        </div>
      </div>
      <div className="speed-legend">
        <span><i className="legend-up" />up</span>
        <span><i className="legend-down" />down</span>
      </div>
    </section>
  );
}

export function createInitialSpeedHistory() {
  return Array.from({ length: 60 }, (_, index) => {
    return {
      down: 0,
      time: Date.now() - (59 - index) * 60000,
      up: 0,
    };
  });
}

function buildLinePath(values, max) {
  if (!values.length) {
    return '';
  }
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 36 - (Math.min(value / max, 1) * 32 + 2);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export default SpeedHistoryGraph;
