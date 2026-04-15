import Head from 'next/head';
import { useEffect, useState } from 'react';
import DashboardFrame from '@/components/layout/dashboard-frame';
import MetricBox from '@/components/ui/metric-box';
import StatusPill from '@/components/ui/status-pill';
import styles from '@/styles/Dashboard.module.css';
import { SystemState, SensorParameters } from '@/types/system';

export default function AutoControlPage() {
  const [state, setState] = useState<SystemState | null>(null);
  const [parameters, setParameters] = useState<SensorParameters | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    const response = await fetch('/api/status');
    const payload = await response.json();
    if (payload.ok) setState(payload.data as SystemState);
  };

  const loadParameters = async () => {
    try {
      const response = await fetch('/api/parameters');
      const payload = await response.json();
      if (payload.success && payload.data) {
        setParameters(payload.data);
      }
    } catch (error) {
      console.error('Error loading parameters:', error);
    }
  };

  useEffect(() => {
    loadStatus();
    loadParameters();
    const timer = setInterval(loadStatus, 2000);
    return () => clearInterval(timer);
  }, []);

  const changeMode = async (mode: 'AUTO' | 'MANUAL') => {
    setLoading(true);
    const response = await fetch('/api/control/mode', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    const payload = await response.json();
    if (payload.ok) setState(payload.data as SystemState);
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>Kontrol Otomatis - Hydrant Monitor</title>
      </Head>

      <DashboardFrame title="KONTROL OTOMATIS" active="auto">
        <section className={styles.kpiStrip}>
          <MetricBox label="Mode" value={state?.controlMode ?? '-'} sub="Current" />
          <MetricBox label="Valve" value={state?.valveOpen ? 'Open' : 'Closed'} sub="Current" />
          <MetricBox label="Fire" value={`${state?.sensor.firePercent.toFixed(0) ?? '-'}%`} sub="Realtime" />
          <MetricBox label="Alert" value={<StatusPill level={state?.alertLevel} />} sub="Decision basis" />
        </section>

        <section className={styles.panelCard}>
          <h2>Auto Rule Engine</h2>
          <p>
            Rule aktif: valve terbuka jika level alert Warning atau Critical. Valve menutup saat status kembali Safe.
          </p>

          <div className={styles.ruleBox}>
            <p>Rule 1: Fire &gt;= {parameters?.firePercentThreshold ?? 70}% and Temp &gt;= {parameters?.temperatureThreshold ? Math.floor(parameters.temperatureThreshold * 0.67) : 40}°C =&gt; Warning</p>
            <p>Rule 2: Fire = 100% and Temp &gt;= {parameters?.temperatureThreshold ?? 60}°C =&gt; Critical</p>
            <p>Action: Warning/Critical =&gt; Valve Open</p>
          </div>

          <div className={styles.actionRow}>
            <button disabled={loading} className={`${styles.button} ${styles.primary}`} onClick={() => changeMode('AUTO')}>
              Aktifkan AUTO
            </button>
            <button disabled={loading} className={`${styles.button} ${styles.ghost}`} onClick={() => changeMode('MANUAL')}>
              Pindah MANUAL
            </button>
          </div>
        </section>
      </DashboardFrame>
    </>
  );
}
