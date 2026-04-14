import Head from 'next/head';
import { useEffect, useState } from 'react';
import DashboardFrame from '@/components/layout/dashboard-frame';
import LinePanel from '@/components/ui/line-panel';
import MetricBox from '@/components/ui/metric-box';
import StatusPill from '@/components/ui/status-pill';
import styles from '@/styles/Dashboard.module.css';
import { SystemState } from '@/types/system';
import { withAuth } from '@/components/hoc/withAuth';

const firePath = 'M0 68 C48 74, 88 26, 146 52 C186 72, 218 72, 255 62 C293 52, 328 108, 368 100 C410 90, 432 54, 480 44';
const tempPath = 'M0 40 C34 46, 82 62, 126 88 C166 120, 206 130, 248 82 C286 46, 332 80, 374 86 C416 90, 440 50, 480 62';

function DashboardPage() {
  const [state, setState] = useState<SystemState | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/status');
      const payload = await response.json();
      if (payload.ok) setState(payload.data as SystemState);
    };

    load();
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Head>
        <title>Dashboard - Hydrant Monitor</title>
      </Head>

      <DashboardFrame title="DASHBOARD (HALAMAN UTAMA)" active="dashboard">
        <section className={styles.kpiStrip}>
          <MetricBox label="Fire Percentage" value={`${state?.sensor.firePercent.toFixed(0) ?? '-'}%`} sub="2s update" />
          <MetricBox label="Temperature" value={`${state?.sensor.temperatureC.toFixed(1) ?? '-'}C`} sub="Live sensor" />
          <MetricBox label="Pressure" value={`${state?.sensor.pressureBar.toFixed(2) ?? '-'} bar`} sub="Hydrant line" />
          <MetricBox label="System Status" value={<StatusPill level={state?.alertLevel} />} sub={state?.controlMode ?? '-'} />
        </section>

        <section className={styles.contentGrid}>
          <div className={styles.mainPanel}>
            <LinePanel title="Fire Sensor Trend" subtitle="Fire intensity (%)" path={firePath} />
            <LinePanel title="Temperature Trend" subtitle="Temperature (C)" path={tempPath} />

            <div className={styles.bottomPair}>
              <article className={styles.smallTile}>
                <p>Valve</p>
                <h4>{state?.valveOpen ? 'Open' : 'Closed'}</h4>
                <span>Output flow {state?.sensor.flowRateLpm.toFixed(0) ?? '-'} L/min</span>
              </article>

              <article className={styles.smallTile}>
                <p>Control Mode</p>
                <h4>{state?.controlMode ?? '-'}</h4>
                <span>{state?.lastAction ?? '-'}</span>
              </article>
            </div>
          </div>

          <aside className={styles.sidePanel}>
            <MetricBox label="Water Level" value={`${state?.sensor.waterLevelPercent.toFixed(0) ?? '-'}%`} sub="Tank reserve" />
            <MetricBox label="Flow Rate" value={`${state?.sensor.flowRateLpm.toFixed(0) ?? '-'} L/min`} sub="Valve throughput" />
            <div className={styles.insightCard}>
              <p className={styles.insightTitle}>Incident Insight</p>
              <p>
                Ketika fire sensor melewati 70% dan suhu di atas 40C, sistem akan masuk warning mode dan
                valve auto dibuka.
              </p>
            </div>
          </aside>
        </section>
      </DashboardFrame>
    </>
  );
}

export default withAuth(DashboardPage);
