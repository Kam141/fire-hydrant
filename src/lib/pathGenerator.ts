import { SensorLogEntry } from '@/types/system';

/**
 * Convert sensor log entries to SVG path for visualization
 * Scales data to fit in a 480x140 canvas
 */
export function generateSensorPath(
  entries: SensorLogEntry[],
  dataKey: 'firePercent' | 'temperatureC',
  minValue: number = 0,
  maxValue: number = dataKey === 'firePercent' ? 100 : 80
): string {
  if (entries.length === 0) return 'M0 70';

  // Reverse to get chronological order (oldest first)
  const sorted = [...entries].reverse();

  // Calculate x and y coordinates
  const points = sorted.map((entry, index) => {
    // X: distribute across 480px width
    const x = (index / (sorted.length - 1 || 1)) * 480;

    // Y: normalize sensor value to 140px height (inverted for SVG)
    const sensorValue = entry[dataKey];
    const normalized = (sensorValue - minValue) / (maxValue - minValue);
    const y = 140 - Math.max(0, Math.min(1, normalized)) * 116; // Leave 12px padding top/bottom

    return { x, y };
  });

  // Generate smooth curve path using quadratic Bezier curves
  if (points.length === 1) {
    return `M${points[0].x} ${points[0].y}`;
  }

  let path = `M${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const curr = points[i];
    const prev = points[i - 1];

    // Use quadratic Bezier curve for smooth interpolation
    const cpx = (prev.x + curr.x) / 2;
    const cpy = (prev.y + curr.y) / 2;

    path += ` Q${cpx} ${cpy} ${curr.x} ${curr.y}`;
  }

  return path;
}

/**
 * Filter sensor entries from the last N seconds
 */
export function getRecentEntries(
  entries: SensorLogEntry[],
  secondsBack: number = 10
): SensorLogEntry[] {
  if (entries.length === 0) return [];

  const now = Date.now();
  const thresholdMs = secondsBack * 1000;

  return entries.filter((entry) => {
    const entryTime = new Date(entry.timestamp).getTime();
    return now - entryTime <= thresholdMs;
  });
}
