import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '@/context/AuthContext';
import { withRoleProtection } from '@/components/hoc/withRoleProtection';
import DashboardFrame from '@/components/layout/dashboard-frame';
import { SensorParameters } from '@/types/system';
import styles from '@/styles/Dashboard.module.css';

function SensorCalibrationPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [parameters, setParameters] = useState<SensorParameters>({
    temperatureWarningThreshold: 40,
    temperatureCriticalThreshold: 60,
    firePercentWarningThreshold: 20,
    firePercentCriticalThreshold: 50,
    smokePercentWarningThreshold: 30,
    smokePercentCriticalThreshold: 60,
    pressureThreshold: 5,
    flowRateThreshold: 10,
    waterLevelThreshold: 20,
    waterLevelNotificationEnabled: true,
    fireRawMin: 0,
    fireRawMax: 4095,
    smokeRawMin: 0,
    smokeRawMax: 1000,
    tempRawMin: 0,
    tempRawMax: 100,
  });

  useEffect(() => {
    fetchParameters();
  }, []);

  const fetchParameters = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/parameters');
      const payload = await response.json();

      if (payload.success) {
        setParameters(payload.data);
      } else {
        setError(payload.error || 'Failed to fetch parameters');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch parameters');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof SensorParameters, value: number) => {
    setParameters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch('/api/parameters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken() || ''}`,
        },
        body: JSON.stringify(parameters),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save parameters');
      }

      if (result.success) {
        setSuccessMessage('Kalibrasi sensor berhasil disimpan');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save parameters');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    fetchParameters();
    setError(null);
    setSuccessMessage(null);
  };

  if (loading) {
    return (
      <DashboardFrame title="SENSOR CALIBRATION" active="calibration">
        <div className={styles.panelCard} style={{ textAlign: 'center', padding: '2rem' }}>
          Loading...
        </div>
      </DashboardFrame>
    );
  }

  return (
    <>
      <Head>
        <title>Sensor Calibration - Hydrant Admin</title>
      </Head>

      <DashboardFrame title="SENSOR CALIBRATION" active="calibration">
        <section className={styles.panelCard}>
          <div className={styles.panelHeaderRow} style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eaeaea', paddingBottom: '1rem' }}>
            <div>
              <h2>Sensor Calibration & Thresholds</h2>
              <p>Configure raw sensor value ranges and alert thresholds for fire, smoke, and temperature detection.</p>
            </div>
          </div>

          {error && (
            <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #fca5a5' }}>
              {error}
            </div>
          )}

          {successMessage && (
            <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #86efac' }}>
              {successMessage}
            </div>
          )}

          {/* Fire Sensor Calibration */}
          <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginTop: 0, color: '#1e293b' }}>🔥 Fire Sensor Calibration</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
              Configure the raw ADC value range for fire detection. Lower raw values indicate more fire/heat.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: '#475569' }}>
                  Raw Value @ 0% Fire (Min - No fire)
                </label>
                <input
                  type="number"
                  value={parameters.fireRawMax ?? 4095}
                  onChange={(e) => handleInputChange('fireRawMax', Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: '#475569' }}>
                  Raw Value @ 100% Fire (Max - Full fire)
                </label>
                <input
                  type="number"
                  value={parameters.fireRawMin ?? 0}
                  onChange={(e) => handleInputChange('fireRawMin', Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: '#475569' }}>
                  Fire Warning Threshold (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={parameters.firePercentWarningThreshold}
                  onChange={(e) => handleInputChange('firePercentWarningThreshold', Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: '#475569' }}>
                  Fire Critical Threshold (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={parameters.firePercentCriticalThreshold}
                  onChange={(e) => handleInputChange('firePercentCriticalThreshold', Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
            </div>
          </div>

          {/* Smoke Sensor Calibration */}
          <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginTop: 0, color: '#1e293b' }}>💨 Smoke Sensor Calibration</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
              Configure the raw ADC value range for smoke detection (Gas sensor). Values scale from 0 (no smoke) to 1000 (maximum smoke).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: '#475569' }}>
                  Raw Value @ 0% Smoke (Min - No smoke)
                </label>
                <input
                  type="number"
                  value={parameters.smokeRawMin ?? 0}
                  onChange={(e) => handleInputChange('smokeRawMin', Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: '#475569' }}>
                  Raw Value @ 100% Smoke (Max - Heavy smoke)
                </label>
                <input
                  type="number"
                  value={parameters.smokeRawMax ?? 1000}
                  onChange={(e) => handleInputChange('smokeRawMax', Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: '#475569' }}>
                  Smoke Warning Threshold (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={parameters.smokePercentWarningThreshold ?? 30}
                  onChange={(e) => handleInputChange('smokePercentWarningThreshold', Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: '#475569' }}>
                  Smoke Critical Threshold (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={parameters.smokePercentCriticalThreshold ?? 60}
                  onChange={(e) => handleInputChange('smokePercentCriticalThreshold', Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
            </div>
          </div>

          {/* Temperature Sensor Calibration */}
          <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginTop: 0, color: '#1e293b' }}>🌡️ Temperature Sensor Calibration</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
              Configure the raw ADC value range and temperature thresholds for fire detection.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: '#475569' }}>
                  Raw Value @ Min Temperature (°C)
                </label>
                <input
                  type="number"
                  value={parameters.tempRawMin ?? 0}
                  onChange={(e) => handleInputChange('tempRawMin', Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: '#475569' }}>
                  Raw Value @ Max Temperature (°C)
                </label>
                <input
                  type="number"
                  value={parameters.tempRawMax ?? 100}
                  onChange={(e) => handleInputChange('tempRawMax', Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: '#475569' }}>
                  Temperature Warning Threshold (°C)
                </label>
                <input
                  type="number"
                  value={parameters.temperatureWarningThreshold}
                  onChange={(e) => handleInputChange('temperatureWarningThreshold', Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: '#475569' }}>
                  Temperature Critical Threshold (°C)
                </label>
                <input
                  type="number"
                  value={parameters.temperatureCriticalThreshold}
                  onChange={(e) => handleInputChange('temperatureCriticalThreshold', Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              onClick={handleReset}
              disabled={saving}
              className={`${styles.button} ${styles.ghost}`}
              style={{
                padding: '0.6rem 1.2rem',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className={styles.button}
              style={{
                padding: '0.6rem 1.2rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                cursor: saving || loading ? 'not-allowed' : 'pointer',
                opacity: saving || loading ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save Calibration'}
            </button>
          </div>

          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f0f4f8', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: '0.5rem 0', fontWeight: 600 }}>💡 Configuration Tips:</p>
            <ul style={{ marginLeft: '1.2rem', marginTop: '0.5rem' }}>
              <li>Raw Min/Max values define how raw sensor ADC values map to 0-100% range</li>
              <li>Warning thresholds trigger POTENSI_KEBAKARAN alert when combined with temperature</li>
              <li>Critical thresholds trigger KEBAKARAN alert when combined with temperature</li>
              <li>Test calibration values with real sensors before deployment</li>
            </ul>
          </div>
        </section>
      </DashboardFrame>
    </>
  );
}

export default withRoleProtection(SensorCalibrationPage);
