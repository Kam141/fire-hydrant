import styles from '@/styles/Home.module.css';
import { SensorLogEntry } from '@/types/system';
import { ReactNode } from 'react';

interface LogTableProps {
  logs?: SensorLogEntry[];
  statusRenderer?: (level: SensorLogEntry['alertLevel']) => ReactNode;
}

export default function LogTable({ logs = [], statusRenderer }: LogTableProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Waktu</th>
            <th>Api (%)</th>
            <th>Suhu (C)</th>
            <th>Tekanan</th>
            <th>Valve</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 && (
            <tr>
              <td colSpan={6}>Belum ada data log.</td>
            </tr>
          )}
          {logs.map((log) => (
            <tr key={`${log.timestamp}-${log.firePercent}`}>
              <td>{new Date(log.timestamp).toLocaleString('id-ID')}</td>
              <td>{log.firePercent.toFixed(1)}</td>
              <td>{log.temperatureC.toFixed(1)}</td>
              <td>{log.pressureBar.toFixed(2)}</td>
              <td>{log.valveOpen ? 'TERBUKA' : 'TERTUTUP'}</td>
              <td>{statusRenderer ? statusRenderer(log.alertLevel) : log.alertLevel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
