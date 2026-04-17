import styles from '@/styles/Dashboard.module.css';

interface LinePanelProps {
  title: string;
  subtitle: string;
  values: number[];
  timestamps?: string[];
}

function toId(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toChartPath(values: number[], width = 480, height = 140, padding = 20) {
  if (values.length === 0) {
    return `M0 ${height - padding} L${width} ${height - padding}`;
  }

  if (values.length === 1) {
    const y = height / 2;
    return `M0 ${y} L${width} ${y}`;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const normalized = (value - min) / range;
    const y = padding + (1 - normalized) * (height - padding * 2);
    return { x, y };
  });

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${clamp(point.y, 0, height)}`)
    .join(' ');
}

function formatTimeRange(timestamps?: string[]) {
  if (!timestamps || timestamps.length < 2) {
    return 'Time';
  }

  const first = new Date(timestamps[0]);
  const last = new Date(timestamps[timestamps.length - 1]);

  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) {
    return 'Time';
  }

  const start = first.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const end = last.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return `${start} - ${end}`;
}

export default function LinePanel({ title, subtitle, values, timestamps }: LinePanelProps) {
  const id = toId(title);
  const path = toChartPath(values);
  const timeRange = formatTimeRange(timestamps);

  return (
    <article className={styles.chartCard}>
      <div className={styles.chartHead}>
        <p className={styles.chartTitle}>{title}</p>
        <span className={styles.chartTag}>Live</span>
      </div>
      <p className={styles.chartSubtitle}>{subtitle}</p>

      <svg viewBox="0 0 480 140" className={styles.chartSvg} aria-label={title}>
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(190, 25, 25, 0.32)" />
            <stop offset="100%" stopColor="rgba(190, 25, 25, 0.02)" />
          </linearGradient>
        </defs>
        <line x1="0" y1="24" x2="480" y2="24" className={styles.gridLine} />
        <line x1="0" y1="56" x2="480" y2="56" className={styles.gridLine} />
        <line x1="0" y1="88" x2="480" y2="88" className={styles.gridLine} />
        <line x1="0" y1="120" x2="480" y2="120" className={styles.gridLine} />
        <path d={`${path} L480 140 L0 140 Z`} fill={`url(#fill-${id})`} />
        <path d={path} className={styles.chartLine} />
      </svg>

      <p className={styles.chartTime}>{timeRange}</p>
    </article>
  );
}
