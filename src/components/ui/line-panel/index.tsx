import { useMemo, useState } from 'react';
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
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const id = toId(title);

  const chartData = useMemo(() => {
    if (values.length === 0) {
      return [] as Array<{ x: number; y: number; value: number; timestamp?: string }>;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 1);

    return values.map((value, index) => {
      const x = (index / (values.length - 1)) * 480;
      const normalized = (value - min) / range;
      const y = 20 + (1 - normalized) * (140 - 40);
      return {
        x,
        y: clamp(y, 0, 140),
        value,
        timestamp: timestamps?.[index],
      };
    });
  }, [values, timestamps]);

  const linePath = chartData
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
    .join(' ');

  const areaPath = chartData.length > 0
    ? `${linePath} L480 140 L0 140 Z`
    : `M0 120 L480 120 L480 140 L0 140 Z`;

  const tooltipPoint = hoverIndex !== null ? chartData[hoverIndex] : null;
  const tooltipX = tooltipPoint ? clamp(tooltipPoint.x - 68, 8, 480 - 136) : 0;
  const tooltipY = tooltipPoint ? clamp(tooltipPoint.y - 46, 8, 140 - 44) : 0;

  const hitAreas = chartData.map((point, index) => {
    const prev = index === 0 ? 0 : chartData[index - 1].x;
    const next = index === chartData.length - 1 ? 480 : chartData[index + 1].x;
    const start = index === 0 ? 0 : (prev + point.x) / 2;
    const end = index === chartData.length - 1 ? 480 : (point.x + next) / 2;
    return {
      x: start,
      width: Math.max(end - start, 1),
      index,
    };
  });

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
            <stop offset="0%" stopColor="rgba(190, 25, 25, 0.28)" />
            <stop offset="100%" stopColor="rgba(190, 25, 25, 0.02)" />
          </linearGradient>
        </defs>

        <line x1="0" y1="24" x2="480" y2="24" className={styles.gridLine} />
        <line x1="0" y1="56" x2="480" y2="56" className={styles.gridLine} />
        <line x1="0" y1="88" x2="480" y2="88" className={styles.gridLine} />
        <line x1="0" y1="120" x2="480" y2="120" className={styles.gridLine} />

        <path d={areaPath} fill={`url(#fill-${id})`} />
        <path d={linePath} className={styles.chartLine} />

        {hitAreas.map((area) => (
          <rect
            key={`hit-${area.index}`}
            x={area.x}
            y={0}
            width={area.width}
            height={140}
            fill="transparent"
            onPointerEnter={() => setHoverIndex(area.index)}
            onPointerMove={() => setHoverIndex(area.index)}
            onPointerLeave={() => setHoverIndex(null)}
          />
        ))}

        {tooltipPoint && (
          <g pointerEvents="none">
            <line
              x1={tooltipPoint.x}
              y1={tooltipPoint.y}
              x2={tooltipPoint.x}
              y2={132}
              stroke="#a1a8b8"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <circle
              cx={tooltipPoint.x}
              cy={tooltipPoint.y}
              r={5}
              fill="#fff"
              stroke="#701313"
              strokeWidth="2"
            />
            <rect
              x={tooltipX}
              y={tooltipY}
              width="136"
              height="42"
              rx="10"
              fill="#1f2531"
              opacity="0.94"
            />
            <text x={tooltipX + 10} y={tooltipY + 18} fill="#f8f9ff" fontSize="11" fontWeight="700">
              {tooltipPoint.value.toFixed(1)}
            </text>
            <text x={tooltipX + 10} y={tooltipY + 33} fill="#cfd6e6" fontSize="10">
              {tooltipPoint.timestamp ? new Date(tooltipPoint.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'No time'}
            </text>
          </g>
        )}
      </svg>

      <p className={styles.chartTime}>{timeRange}</p>
    </article>
  );
}
