import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardFrame from '@/components/layout/dashboard-frame';
import MetricBox from '@/components/ui/metric-box';
import StatusPill from '@/components/ui/status-pill';
import styles from '@/styles/Dashboard.module.css';
import { SystemState } from '@/types/system';
import { getNotificationParameters } from '@/lib/firebaseConfig';

const defaultNotificationConfig = {
  waterLevelNotificationEnabled: true,
  telegramSummaryEnabled: true,
  telegramFireAlertsEnabled: true,
  telegramManualValveEnabled: true,
  telegramLowWaterEnabled: true,
  telegramIntervalMinutes: 10,
};

function normalizeSensorWaterLevel(value: unknown): number | null {
  if (typeof value === 'boolean') {
    return value ? 100 : 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'high', 'terisi', 'on', 'ya', 'yes', '1'].includes(normalized)) {
      return 100;
    }
    if (['false', 'low', 'habis', 'off', 'tidak', 'no', '0'].includes(normalized)) {
      return 0;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === 'number') {
    if (value === 0 || value === 1) {
      return value * 100;
    }
    return value;
  }
  return null;
}

function formatSensorWaterLevel(value: unknown): string {
  if (typeof value === 'boolean') {
    return value ? 'Terisi (HIGH)' : 'Habis (LOW)';
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'high', 'terisi', 'on', 'ya', 'yes', '1'].includes(normalized)) {
      return 'Terisi (HIGH)';
    }
    if (['false', 'low', 'habis', 'off', 'tidak', 'no', '0'].includes(normalized)) {
      return 'Habis (LOW)';
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? `${parsed.toFixed(1)}%` : value;
  }
  if (typeof value === 'number') {
    if (value === 100) {
      return 'Terisi (HIGH)';
    }
    if (value === 0) {
      return 'Habis (LOW)';
    }
    return `${value.toFixed(1)}%`;
  }
  return '-';
}

export default function NotificationPage() {
  const { user, role } = useAuth();
  const canEdit = role === 'admin' || role === 'petugas';
  const [state, setState] = useState<SystemState | null>(null);
  const [config, setConfig] = useState<any>(defaultNotificationConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sendLatestLoading, setSendLatestLoading] = useState(false);

  const loadStatusAndConfig = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const [statusRes, firebaseParams] = await Promise.all([
        fetch('/api/status'),
        getNotificationParameters(),
      ]);

      const statusPayload = await statusRes.json();
      if (statusPayload.ok) setState(statusPayload.data as SystemState);

      if (firebaseParams) {
        setConfig({ ...defaultNotificationConfig, ...firebaseParams });
      } else {
        setConfig(defaultNotificationConfig);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal memuat status notifikasi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatusAndConfig();
    const timer = setInterval(loadStatusAndConfig, 10000);
    return () => clearInterval(timer);
  }, []);

  const saveConfig = async (updatedConfig: any) => {
    if (!user) {
      setMessage('Login dibutuhkan untuk mengubah pengaturan notifikasi.');
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/notifications/parameters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ ...config, ...updatedConfig }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Gagal menyimpan pengaturan');
      }

      setConfig({ ...config, ...updatedConfig });
      setMessage('Pengaturan notifikasi berhasil disimpan.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleToggle = async (field: string) => {
    if (!canEdit) {
      setMessage('Hanya Petugas/Admin yang dapat mengubah pengaturan ini.');
      return;
    }
    await saveConfig({ [field]: !config[field] });
  };

  const handleIntervalChange = async (value: number) => {
    if (!canEdit) return;
    if (!Number.isFinite(value) || value < 1 || value > 120) {
      setMessage('Interval harus antara 1 dan 120 menit.');
      return;
    }
    await saveConfig({ telegramIntervalMinutes: value });
  };

  const handleSendLatestHadoopLog = async () => {
    if (!user) {
      setMessage('Login dibutuhkan untuk mengirim log Hadoop.');
      return;
    }

    setSendLatestLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/notifications/send-latest-hadoop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengirim log Hadoop');
      }

      setMessage(result.message || 'Log Hadoop terbaru berhasil dikirim ke Telegram.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal mengirim log Hadoop');
    } finally {
      setSendLatestLoading(false);
    }
  };

  const renderToggle = (label: string, field: string, description: string) => (
    <label className={styles.toggleCard}>
      <div className={styles.toggleContent}>
        <div>
          <strong>{label}</strong>
          <p className={styles.toggleDescription}>{description}</p>
        </div>

        <span className={styles.toggleSwitchWrapper}>
          <input
            type="checkbox"
            checked={Boolean(config[field])}
            onChange={() => handleToggle(field)}
            disabled={saving || !canEdit}
            className={styles.toggleSwitchInput}
          />
          <span className={`${styles.toggleSwitchTrack} ${config[field] ? styles.toggleSwitchActive : ''}`}>
            <span className={styles.toggleSwitchThumb} />
          </span>
        </span>
      </div>
    </label>
  );

  return (
    <>
      <Head>
        <title>Notifikasi - Hydrant Monitor</title>
      </Head>

      <DashboardFrame title="NOTIFIKASI" active="notif">
        <section className={styles.kpiStrip}>
          <MetricBox label="Fire Sensor" value={`${state?.sensor.firePercent.toFixed(1) ?? '-'}%`} sub="Threshold 70%" />
          <MetricBox label="Temperature" value={`${state?.sensor.temperatureC.toFixed(1) ?? '-'}°C`} sub="Threshold 40°C" />
          <MetricBox label="Alert State" value={<StatusPill level={state?.alertLevel} />} sub="Realtime" />
          <MetricBox label="Valve" value={state?.valveOpen ? 'Open' : 'Closed'} sub="Current response" />
        </section>

        <section className={styles.panelCard}>
          <h2>Telegram Notification Scenarios</h2>
          <p>Enable or disable Telegram alerts for the main notification scenarios below.</p>

          {message && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '8px', backgroundColor: '#f8fafc', color: '#0f172a' }}>
              {message}
            </div>
          )}

          <div style={{ display: 'grid', gap: '1rem' }}>
            {renderToggle(
              'Fire alert notifications',
              'telegramFireAlertsEnabled',
              'Kirim peringatan Telegram saat fire warning atau kebakaran terdeteksi.'
            )}
            {renderToggle(
              'Telegram summary enabled',
              'telegramSummaryEnabled',
              'Kirim ringkasan sensor secara rutin ke Telegram.'
            )}
            {renderToggle(
              'Manual valve notification',
              'telegramManualValveEnabled',
              'Kirim notifikasi segera ketika valve dibuka/ditutup secara manual.'
            )}
            {renderToggle(
              'Low water notification',
              'telegramLowWaterEnabled',
              'Kirim notifikasi ketika level air berada di bawah ambang batas.'
            )}
          </div>

          <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, color: '#334155' }}>Telegram interval (minutes)</label>
              <input
                type="number"
                min={1}
                max={120}
                value={config.telegramIntervalMinutes ?? 10}
                onChange={(event) => handleIntervalChange(Number(event.target.value))}
                disabled={!canEdit || saving}
                style={{
                  width: '140px',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                }}
              />
              <p className={styles.toggleDescription}>Interval untuk ringkasan Telegram. Nilai antara 1 dan 120 menit.</p>
            </div>
          </div>

          {role === 'user' && (
            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}>
              <strong>Mode hanya lihat:</strong> Anda dapat melihat pengaturan notifikasi saat ini, tetapi hanya Petugas/Admin yang dapat mengubahnya.
            </div>
          )}

          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={handleSendLatestHadoopLog}
              disabled={sendLatestLoading}
              className={styles.primaryButton}
              style={{ minWidth: '220px' }}
            >
              {sendLatestLoading ? 'Mengirim...' : 'Kirim log Hadoop terbaru ke Telegram'}
            </button>
          </div>
        </section>

        <section className={styles.panelCard}>
          <h2>Water Level Alert</h2>
          <p>Sistem akan mengirim notifikasi Telegram apabila level air turun lebih rendah dari ambang yang dikonfigurasi.</p>

          <div className={styles.ruleBox}>
            <p>Current Water Level: <strong>{formatSensorWaterLevel(state?.sensor.waterLevelPercent)}</strong></p>
            <p>Status: {state?.sensor.waterLevelPercent !== undefined && normalizeSensorWaterLevel(state?.sensor.waterLevelPercent) !== null && normalizeSensorWaterLevel(state?.sensor.waterLevelPercent)! < (config.waterLevelThreshold ?? 20) ? '⚠️ LOW' : '✓ Normal'}</p>
            <p>Notifikasi dikirim maksimal setiap 15 menit untuk menghindari spam.</p>
          </div>
        </section>
      </DashboardFrame>
    </>
  );
}
