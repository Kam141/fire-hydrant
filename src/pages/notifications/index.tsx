import Head from 'next/head';
import { useEffect, useState } from 'react';
import DashboardFrame from '@/components/layout/dashboard-frame';
import MetricBox from '@/components/ui/metric-box';
import StatusPill from '@/components/ui/status-pill';
import styles from '@/styles/Dashboard.module.css';
import { SystemState } from '@/types/system';

export default function NotificationPage() {
  const [state, setState] = useState<SystemState | null>(null);

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

  return (
    <>
      <Head>
        <title>Notifikasi - Hydrant Monitor</title>
      </Head>

      <DashboardFrame title="NOTIFIKASI" active="notif">
        <section className={styles.kpiStrip}>
          <MetricBox label="Fire Sensor" value={`${state?.sensor.firePercent.toFixed(1) ?? '-'}%`} sub="Threshold 70%" />
          <MetricBox label="Temperature" value={`${state?.sensor.temperatureC.toFixed(1) ?? '-'}C`} sub="Threshold 40C" />
          <MetricBox label="Alert State" value={<StatusPill level={state?.alertLevel} />} sub="Realtime" />
          <MetricBox label="Valve" value={state?.valveOpen ? 'Open' : 'Closed'} sub="Current response" />
        </section>

        <section className={styles.panelCard}>
          <h2>Telegram Alert Logic</h2>
          <p>
            Potensi berapi: Sensor api &gt;= 70% dan suhu &gt;= 40C. Berapi: Sensor api = 100% dan suhu &gt;= 60C.
          </p>

          <div className={styles.ruleBox}>
            <p>Level Safe =&gt; No Telegram alert</p>
            <p>Level Warning =&gt; Kirim notifikasi potensi kebakaran</p>
            <p>Level Critical =&gt; Kirim notifikasi kebakaran aktif</p>
          </div>
        </section>

        <section className={styles.panelCard}>
          <h2>Water Level Alert</h2>
          <p>
            Sistem akan mengirim notifikasi Telegram jika tingkat air turun di bawah ambang batas yang telah ditentukan.
          </p>

          <div className={styles.ruleBox}>
            <p>Current Water Level: <strong>{state?.sensor.waterLevelPercent.toFixed(1) ?? '-'}%</strong></p>
            <p>Status: {state?.sensor.waterLevelPercent && state.sensor.waterLevelPercent < 20 ? '⚠️ LOW' : '✓ Normal'}</p>
            <p>Notifikasi dikirim maksimal setiap 15 menit untuk menghindari spam</p>
          </div>
        </section>
      </DashboardFrame>
    </>
  );
}
