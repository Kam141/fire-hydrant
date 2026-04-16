import Head from 'next/head';
import { useEffect, useState } from 'react';
import DashboardFrame from '@/components/layout/dashboard-frame';
import MetricBox from '@/components/ui/metric-box';
import StatusPill from '@/components/ui/status-pill';
import styles from '@/styles/Dashboard.module.css';
import { SystemState } from '@/types/system';

export default function ManualControlPage() {
  const [state, setState] = useState<SystemState | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    const response = await fetch('/api/status');
    const payload = await response.json();
    if (payload.ok) setState(payload.data as SystemState);
  };

  useEffect(() => {
    loadStatus();
    const timer = setInterval(loadStatus, 2000);
    return () => clearInterval(timer);
  }, []);

  const controlValve = async (open: boolean) => {
    setLoading(true);
    const response = await fetch('/api/control/manual', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ open, operator: 'Petugas Web' }),
    });
    const payload = await response.json();
    if (payload.ok) setState(payload.data as SystemState);
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>Kontrol Manual - Hydrant Monitor</title>
      </Head>

      <DashboardFrame title="KONTROL MANUAL" active="manual">
        <section className={styles.kpiStrip}>
          <MetricBox label="Valve Position" value={state?.valveOpen ? 'Open' : 'Closed'} sub="Current" />
          <MetricBox label="Mode" value={state?.controlMode ?? '-'} sub="Manual operation" />
          <MetricBox label="Flow" value={`${state?.sensor.flowRateLpm.toFixed(0) ?? '-'} L/min`} sub="Realtime" />
          <MetricBox label="Alert" value={<StatusPill level={state?.alertLevel} />} sub="Sensor state" />
        </section>

        <section className={styles.panelCard}>
          <h2>Manual Valve Command</h2>
          <p>
            Gunakan mode ini saat petugas perlu override keputusan otomatis, misalnya untuk simulasi atau emergency.
          </p>

          <div className={styles.actionRow}>
            <button
              disabled={loading}
              className={`${styles.button} ${state?.valveOpen ? styles.primary : styles.ghost}`}
              onClick={() => controlValve(true)}
            >
              Buka Valve
            </button>
            <button
              disabled={loading}
              className={`${styles.button} ${state?.valveOpen ? styles.ghost : styles.danger}`}
              onClick={() => controlValve(false)}
            >
              Tutup Valve
            </button>
          </div>

          <div className={styles.noteCard}>
            <p>Last Action</p>
            <strong>{state?.lastAction ?? '-'}</strong>
          </div>
        </section>
      </DashboardFrame>
    </>
  );
}
