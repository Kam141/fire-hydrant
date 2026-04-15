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
    temperatureThreshold: 60,
    firePercentThreshold: 30,
    pressureThreshold: 5,
    flowRateThreshold: 10,
    waterLevelThreshold: 20,
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
              <li><strong>Suhu:</strong> Aktivator manual jika melebihi ambang batas</li>
              <li><strong>Indikasi Api:</strong> Memicu alert jika terdeteksi</li>
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
              {/* Temperature Threshold */}
              <div className={styles['form-group']}>
                <label htmlFor="temperature">Ambang Batas Suhu (°C)</label>
                <div className={styles['input-wrapper']}>
                  <input
                    id="temperature"
                    type="number"
                    min="0"
                    max="150"
                    step="1"
                    value={parameters.temperatureThreshold}
                    onChange={(e) => handleInputChange('temperatureThreshold', parseFloat(e.target.value))}
                    disabled={saving}
                    className={styles.input}
                  />
                  <span className={styles.unit}>°C</span>
                </div>
                <p className={styles.help}>Suhu maksimum yang diperbolehkan</p>
              </div>

              {/* Fire Percent Threshold */}
              <div className={styles['form-group']}>
                <label htmlFor="firePercent">Ambang Batas Api (%)</label>
                <div className={styles['input-wrapper']}>
                  <input
                    id="firePercent"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={parameters.firePercentThreshold}
                    onChange={(e) => handleInputChange('firePercentThreshold', parseFloat(e.target.value))}
                    disabled={saving}
                    className={styles.input}
                  />
                  <span className={styles.unit}>%</span>
                </div>
                <p className={styles.help}>Persentase indikasi api maksimum</p>
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


          {parameters.updatedAt && (
            <div className={styles['last-updated']}>
              Terakhir diperbarui: {new Date(parameters.updatedAt).toLocaleString('id-ID')}
            </div>
          )}
      </DashboardFrame>
    </>
  );
}

export default withRoleProtection(ParametersPage);
