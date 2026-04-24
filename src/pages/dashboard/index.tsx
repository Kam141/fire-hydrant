import Head from 'next/head';
import { useEffect, useState } from 'react';
import DashboardFrame from '@/components/layout/dashboard-frame';
import LinePanel from '@/components/ui/line-panel';
import MetricBox from '@/components/ui/metric-box';
import StatusPill from '@/components/ui/status-pill';
import styles from '@/styles/Dashboard.module.css';
import { SystemState, SensorLogEntry, SensorParameters } from '@/types/system';
import { withAuth } from '@/components/hoc/withAuth';

function DashboardPage() {
  const [state, setState] = useState<SystemState | null>(null);
  const [logs, setLogs] = useState<SensorLogEntry[]>([]);
  const [parameters, setParameters] = useState<SensorParameters | null>(null);
  const [dataSource, setDataSource] = useState<'hadoop-logs' | 'system-state'>('system-state');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Fetch status (real-time data from Hadoop)
        const statusResponse = await fetch('/api/status');
        const statusPayload = await statusResponse.json();
        if (statusPayload.ok) {
          setState(statusPayload.data as SystemState);
          setDataSource(statusPayload.source || 'system-state');
          setLastUpdate(new Date());
        }

        // Fetch trend data from persisted Hadoop logs
        const logsResponse = await fetch('/api/logs?limit=24');
        const logsPayload = await logsResponse.json();
        if (logsPayload.ok && Array.isArray(logsPayload.data)) {
          setLogs(logsPayload.data as SensorLogEntry[]);
        }

        // Fetch parameters for insight display
        const paramsResponse = await fetch('/api/parameters');
        const paramsPayload = await paramsResponse.json();
        if (paramsPayload.success) {
          setParameters(paramsPayload.data as SensorParameters);
        }
      } catch (err) {
        console.error('Failed to fetch status:', err);
      }
    };

    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);

  const getDataSourceLabel = () => {
    if (dataSource === 'hadoop-logs') {
      return 'Live Hadoop Logs';
    }
    return 'System State (Fallback)';
  };

  const getIncidentInsight = () => {
    if (!parameters) {
      return 'Ketika fire sensor melewati 70% dan suhu di atas 40C, sistem akan masuk warning mode dan valve auto dibuka.';
    }

    const fireWarning = parameters.firePercentWarningThreshold || 20;
    const fireCritical = parameters.firePercentCriticalThreshold || 50;
    const tempWarning = parameters.temperatureWarningThreshold || 40;
    const tempCritical = parameters.temperatureCriticalThreshold || 60;

    return `Konfigurasi Threshold Terkini:
• Warning: Api ≥ ${fireWarning}% dan Suhu ≥ ${tempWarning}°C
• Critical: Api ≥ ${fireCritical}% dan Suhu ≥ ${tempCritical}°C

Ketika threshold terpenuhi, valve otomatis membuka untuk mitigasi kebakaran.`;
  };

  const chartLogs = [...logs].reverse();
  const chartTimestamps = chartLogs.map((entry) => entry.timestamp);
  const fireSeries = chartLogs.map((entry) => entry.firePercent);
  const tempSeries = chartLogs.map((entry) => entry.temperatureC);

  return (
    <>
      <Head>
        <title>Dashboard - Hydrant Monitor</title>
      </Head>

      <DashboardFrame title="DASHBOARD (HALAMAN UTAMA)" active="dashboard">
        <section className={styles.kpiStrip}>
          <MetricBox label="Fire Percentage" value={`${state?.sensor.firePercent.toFixed(0) ?? '-'}%`} sub="Real-time sensor" />
          <MetricBox label="Temperature" value={`${state?.sensor.temperatureC.toFixed(1) ?? '-'}°C`} sub="Live reading" />
          {/* <MetricBox label="Pressure" value={`${state?.sensor.pressureBar.toFixed(2) ?? '-'} bar`} sub="Hydrant line" /> */}
          <MetricBox label="System Status" value={<StatusPill level={state?.alertLevel} />} sub={state?.controlMode ?? '-'} />
        </section>

        <section className={styles.contentGrid}>
          <div className={styles.mainPanel}>  
            <LinePanel
              title="Fire Sensor Trend"
              subtitle="Fire intensity (%)"
              values={fireSeries}
              timestamps={chartTimestamps}
            />
            <LinePanel
              title="Temperature Trend"
              subtitle="Temperature (°C)"
              values={tempSeries}
              timestamps={chartTimestamps}
            />

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

            <div className={styles.dataSourceIndicator}>
              <small>{getDataSourceLabel()}</small>
              {lastUpdate && (
                <small style={{ marginLeft: '10px', color: '#666' }}>
                  Last: {lastUpdate.toLocaleTimeString('id-ID')}
                </small>
              )}
            </div>
          </div>

          <aside className={styles.sidePanel}>
            <MetricBox label="Water Level" value={`${state?.sensor.waterLevelPercent.toFixed(0) ?? '-'}%`} sub="Tank reserve" />
            {/* <MetricBox label="Flow Rate" value={`${state?.sensor.flowRateLpm.toFixed(0) ?? '-'} L/min`} sub="Valve throughput" /> */}
            <div className={styles.insightCard}>
              <p className={styles.insightTitle}>Incident Insight</p>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.85em', lineHeight: '1.5' }}>
                {getIncidentInsight()}
              </p>
            </div>
          </aside>
        </section>
      </DashboardFrame>
    </>
  );
}

export default withAuth(DashboardPage);