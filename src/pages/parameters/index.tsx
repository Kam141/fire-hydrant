import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '@/context/AuthContext';
import { withRoleProtection } from '@/components/hoc/withRoleProtection';
import DashboardFrame from '@/components/layout/dashboard-frame';
import { SensorParameters } from '@/types/system';
import styles from './parameters.module.css';

function ParametersPage() {
  const { user } = useAuth();
  const [parameters, setParameters] = useState<SensorParameters>({
    temperatureWarningThreshold: 40,
    temperatureCriticalThreshold: 60,
    firePercentWarningThreshold: 20,
    firePercentCriticalThreshold: 50,
    pressureThreshold: 5,
    flowRateThreshold: 10,
    waterLevelThreshold: 20,
    waterLevelNotificationEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch current parameters
  useEffect(() => {
    fetchParameters();
  }, []);

  const fetchParameters = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/parameters', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken() || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch parameters: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setParameters(result.data);
      } else {
        setError(result.error || 'Failed to load parameters');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch parameters');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof SensorParameters, value: number) => {
    setParameters({
      ...parameters,
      [field]: value,
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/parameters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken() || ''}`,
        },
        body: JSON.stringify(parameters),
      });

      if (!response.ok) {
        throw new Error(`Failed to save parameters: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setSuccessMessage('Parameter berhasil disimpan!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || 'Failed to save parameters');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save parameters');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    await fetchParameters();
    setError(null);
  };

  if (loading) {
    return (
      <DashboardFrame title="PARAMETER SENSOR" active="parameters">
        <div className={styles.container}>
          <div className={styles['loading-spinner']}>
            <div>Loading...</div>
          </div>
        </div>
      </DashboardFrame>
    );
  }

  return (
    <>

      <DashboardFrame title="PARAMETER SENSOR" active="parameters">

          {error && (
            <div className={styles['alert-error']}>
              <span>❌ {error}</span>
              <button onClick={() => setError(null)}>Tutup</button>
            </div>
          )}

          {successMessage && (
            <div className={styles['alert-success']}>
              <span>✓ {successMessage}</span>
            </div>
          )}


          <div className={styles.info}>
            <h3>Informasi Parameter:</h3>
            <p>
              Parameter sensor digunakan untuk menentukan kapan sistem hidran secara otomatis mengaktifkan alarm
              atau mengambil tindakan. Silakan sesuaikan nilai-nilai ini berdasarkan kebutuhan lokasi Anda.
            </p>
            <ul>
              <li><strong>Suhu:</strong> Warning dan Critical untuk pemicu alarm manual</li>
              <li><strong>Indikasi Api:</strong> Warning dan Critical untuk mendeteksi kemungkinan kebakaran</li>
              <li><strong>Tekanan:</strong> Minimum untuk operasi sistem</li>
              <li><strong>Laju Aliran:</strong> Minimum untuk membuka katup</li>
              <li><strong>Tingkat Air:</strong> Peringatan jika air menjadi rendah</li>
            </ul>
          </div>

          <div className={styles['form-container']}>
            <div className={styles['form-header']}>
              <p className={styles['form-description']}>Atur nilai ambang batas untuk semua sensor sistem</p>
            </div>
            <div className={styles['form-grid']}>
              {/* Temperature Warning Threshold */}
              <div className={styles['form-group']}>
                <label htmlFor="tempWarning">Ambang Batas Suhu - Peringatan (°C)</label>
                <div className={styles['input-wrapper']}>
                  <input
                    id="tempWarning"
                    type="number"
                    min="0"
                    max="150"
                    step="1"
                    value={parameters.temperatureWarningThreshold}
                    onChange={(e) => handleInputChange('temperatureWarningThreshold', parseFloat(e.target.value))}
                    disabled={saving}
                    className={styles.input}
                  />
                  <span className={styles.unit}>°C</span>
                </div>
                <p className={styles.help}>Suhu pemicu level WARNING</p>
              </div>

              {/* Temperature Critical Threshold */}
              <div className={styles['form-group']}>
                <label htmlFor="tempCritical">Ambang Batas Suhu - Kritis (°C)</label>
                <div className={styles['input-wrapper']}>
                  <input
                    id="tempCritical"
                    type="number"
                    min="0"
                    max="150"
                    step="1"
                    value={parameters.temperatureCriticalThreshold}
                    onChange={(e) => handleInputChange('temperatureCriticalThreshold', parseFloat(e.target.value))}
                    disabled={saving}
                    className={styles.input}
                  />
                  <span className={styles.unit}>°C</span>
                </div>
                <p className={styles.help}>Suhu pemicu level CRITICAL</p>
              </div>

              {/* Fire Percent Warning Threshold */}
              <div className={styles['form-group']}>
                <label htmlFor="fireWarning">Ambang Batas Api - Peringatan (%)</label>
                <div className={styles['input-wrapper']}>
                  <input
                    id="fireWarning"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={parameters.firePercentWarningThreshold}
                    onChange={(e) => handleInputChange('firePercentWarningThreshold', parseFloat(e.target.value))}
                    disabled={saving}
                    className={styles.input}
                  />
                  <span className={styles.unit}>%</span>
                </div>
                <p className={styles.help}>Persentase api pemicu level WARNING</p>
              </div>

              {/* Fire Percent Critical Threshold */}
              <div className={styles['form-group']}>
                <label htmlFor="fireCritical">Ambang Batas Api - Kritis (%)</label>
                <div className={styles['input-wrapper']}>
                  <input
                    id="fireCritical"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={parameters.firePercentCriticalThreshold}
                    onChange={(e) => handleInputChange('firePercentCriticalThreshold', parseFloat(e.target.value))}
                    disabled={saving}
                    className={styles.input}
                  />
                  <span className={styles.unit}>%</span>
                </div>
                <p className={styles.help}>Persentase api pemicu level CRITICAL</p>
              </div>

              {/* Pressure Threshold */}
              <div className={styles['form-group']}>
                <label htmlFor="pressure">Ambang Batas Tekanan (bar)</label>
                <div className={styles['input-wrapper']}>
                  <input
                    id="pressure"
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={parameters.pressureThreshold}
                    onChange={(e) => handleInputChange('pressureThreshold', parseFloat(e.target.value))}
                    disabled={saving}
                    className={styles.input}
                  />
                  <span className={styles.unit}>bar</span>
                </div>
                <p className={styles.help}>Tekanan minimum yang diperlukan</p>
              </div>

              {/* Flow Rate Threshold */}
              <div className={styles['form-group']}>
                <label htmlFor="flowRate">Ambang Batas Laju Aliran (LPM)</label>
                <div className={styles['input-wrapper']}>
                  <input
                    id="flowRate"
                    type="number"
                    min="0"
                    max="1000"
                    step="1"
                    value={parameters.flowRateThreshold}
                    onChange={(e) => handleInputChange('flowRateThreshold', parseFloat(e.target.value))}
                    disabled={saving}
                    className={styles.input}
                  />
                  <span className={styles.unit}>LPM</span>
                </div>
                <p className={styles.help}>Laju aliran air minimum (Liter per Menit)</p>
              </div>

              {/* Water Level Threshold */}
              <div className={styles['form-group']}>
                <label htmlFor="waterLevel">Ambang Batas Tingkat Air (%)</label>
                <div className={styles['input-wrapper']}>
                  <input
                    id="waterLevel"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={parameters.waterLevelThreshold}
                    onChange={(e) => handleInputChange('waterLevelThreshold', parseFloat(e.target.value))}
                    disabled={saving}
                    className={styles.input}
                  />
                  <span className={styles.unit}>%</span>
                </div>
                <p className={styles.help}>Tingkat air minimum dalam tangki</p>
              </div>
            </div>

            {/* Water Level Notification Toggle */}
            <div className={styles['checkbox-group']}>
              <label htmlFor="waterLevelNotif" className={styles['checkbox-label']}>
                <input
                  id="waterLevelNotif"
                  type="checkbox"
                  checked={parameters.waterLevelNotificationEnabled !== false}
                  onChange={(e) => handleInputChange('waterLevelNotificationEnabled', e.target.checked)}
                  disabled={saving}
                  className={styles.checkbox}
                />
                <span>Aktifkan notifikasi saat tingkat air di bawah ambang batas</span>
              </label>
              <p className={styles['checkbox-help']}>
                Ketika diaktifkan, sistem akan mengirim notifikasi Telegram jika tingkat air turun di bawah {parameters.waterLevelThreshold}%.
              </p>
            </div>

            <div className={styles['button-group']}>
              <button
                onClick={handleSave}
                disabled={saving}
                className={styles['btn-primary']}
              >
                {saving ? 'Menyimpan...' : 'Simpan Parameter'}
              </button>
              <button
                onClick={handleReset}
                disabled={saving}
                className={styles['btn-secondary']}
              >
                Batalkan Perubahan
              </button>
            </div>
          </div>
      </DashboardFrame>
    </>
  );
}

export default withRoleProtection(ParametersPage);
