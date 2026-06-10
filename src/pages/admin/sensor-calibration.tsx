import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth } from '@/context/AuthContext';
import { withRoleProtection } from '@/components/hoc/withRoleProtection';
import DashboardFrame from '@/components/layout/dashboard-frame';
import styles from '@/styles/Dashboard.module.css';

const InputField = ({ label, field, value, error, onChange, disabled }: any) => (
  <div>
    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: '#475569' }}>
      {label}
    </label>
    <input
      type="text"
      inputMode="numeric"
      value={value ?? ''}
      onChange={(e) => onChange(field, e.target.value)}
      disabled={disabled}
      style={{ 
        width: '100%', 
        padding: '0.6rem', 
        borderRadius: '6px', 
        border: `1px solid ${error ? '#ef4444' : '#cbd5e1'}`, 
        fontSize: '0.9rem',
        outlineColor: error ? '#ef4444' : '#3b82f6',
        backgroundColor: disabled ? '#f8fafc' : error ? '#fef2f2' : '#fff',
        color: disabled ? '#64748b' : '#0f172a',
      }}
    />
    {error && (
      <span style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
        ⚠ {error}
      </span>
    )}
  </div>
);

function SensorCalibrationPage() {
  const { user, role } = useAuth();
  const canEdit = role === 'admin' || role === 'petugas';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [parameters, setParameters] = useState<any>({
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchParameters();
  }, []);

  const fetchParameters = async () => {
    try {
      setLoading(true);
      setApiError(null);

      const response = await fetch('/api/parameters');
      const payload = await response.json();

      if (payload.success) {
        setParameters(payload.data);
        // Clear errors on fresh load
        setErrors({});
      } else {
        setApiError(payload.error || 'Failed to fetch parameters');
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to fetch parameters');
    } finally {
      setLoading(false);
    }
  };

  const validateField = (field: string, value: string) => {
    if (value === "") return "Field ini wajib diisi";
    if (/^0[0-9]+/.test(value)) return "Leading zero tidak diperbolehkan";
    if (/[^0-9.-]/.test(value)) return "Harus berupa angka valid";
    
    const num = Number(value);
    if (isNaN(num)) return "Harus berupa angka";

    const percentFields = [
      'firePercentWarningThreshold',
      'firePercentCriticalThreshold',
      'smokePercentWarningThreshold',
      'smokePercentCriticalThreshold'
    ];
    if (percentFields.includes(field)) {
      if (num < 0 || num > 100) return "Nilai harus antara 0 dan 100";
    }
    return "";
  };

  const handleInputChange = (field: string, value: string) => {
    const errorMsg = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: errorMsg }));
    setParameters((prev: any) => ({ ...prev, [field]: value }));
  };

  const hasValidationErrors = Object.values(errors).some(err => err !== "");

  const handleSave = async () => {
    if (!canEdit) {
      setApiError('Hanya Petugas/Admin yang dapat menyimpan konfigurasi ini.');
      return;
    }
    if (hasValidationErrors) return;

    try {
      setSaving(true);
      setApiError(null);
      setSuccessMessage(null);

      // Convert values to numbers
      const dataToSave = { ...parameters };
      for (const key in dataToSave) {
        if (key !== 'id' && key !== 'updatedAt' && key !== 'updatedBy' && typeof dataToSave[key] !== 'boolean') {
          if (dataToSave[key] !== '' && dataToSave[key] !== null) {
            dataToSave[key] = Number(dataToSave[key]);
          }
        }
      }

      const response = await fetch('/api/parameters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken() || ''}`,
        },
        body: JSON.stringify(dataToSave),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save parameters');
      }

      if (result.success) {
        setSuccessMessage('Kalibrasi sensor berhasil disimpan');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setApiError(result.error);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to save parameters');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    fetchParameters();
    setApiError(null);
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
              {/* <h2>Sensor Calibration & Thresholds</h2> */}
              <p>Configure raw sensor value ranges and alert thresholds for fire, smoke, and temperature detection.</p>
            </div>
          </div>

          {apiError && (
            <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #fca5a5' }}>
              {apiError}
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
              <InputField 
                label="Raw Value @ 0% Fire (Min - No fire)" 
                field="fireRawMax" 
                value={parameters.fireRawMax} 
                error={errors.fireRawMax} 
                onChange={handleInputChange} 
                disabled={!canEdit}
              />
              <InputField 
                label="Raw Value @ 100% Fire (Max - Full fire)" 
                field="fireRawMin" 
                value={parameters.fireRawMin} 
                error={errors.fireRawMin} 
                onChange={handleInputChange} 
                disabled={!canEdit}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <InputField 
                label="Fire Warning Threshold (%)" 
                field="firePercentWarningThreshold" 
                value={parameters.firePercentWarningThreshold} 
                error={errors.firePercentWarningThreshold} 
                onChange={handleInputChange} 
                disabled={!canEdit}
              />
              <InputField 
                label="Fire Critical Threshold (%)" 
                field="firePercentCriticalThreshold" 
                value={parameters.firePercentCriticalThreshold} 
                error={errors.firePercentCriticalThreshold} 
                onChange={handleInputChange} 
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Smoke Sensor Calibration */}
          <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginTop: 0, color: '#1e293b' }}>💨 Smoke Sensor Calibration</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
              Configure the raw ADC value range for smoke detection (Gas sensor). Values scale from 0 (no smoke) to 1000 (maximum smoke).
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <InputField 
                label="Raw Value @ 0% Smoke (Min - No smoke)" 
                field="smokeRawMin" 
                value={parameters.smokeRawMin} 
                error={errors.smokeRawMin} 
                onChange={handleInputChange} 
                disabled={!canEdit}
              />
              <InputField 
                label="Raw Value @ 100% Smoke (Max - Heavy smoke)" 
                field="smokeRawMax" 
                value={parameters.smokeRawMax} 
                error={errors.smokeRawMax} 
                onChange={handleInputChange} 
                disabled={!canEdit}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <InputField 
                label="Smoke Warning Threshold (%)" 
                field="smokePercentWarningThreshold" 
                value={parameters.smokePercentWarningThreshold} 
                error={errors.smokePercentWarningThreshold} 
                onChange={handleInputChange} 
                disabled={!canEdit}
              />
              <InputField 
                label="Smoke Critical Threshold (%)" 
                field="smokePercentCriticalThreshold" 
                value={parameters.smokePercentCriticalThreshold} 
                error={errors.smokePercentCriticalThreshold} 
                onChange={handleInputChange} 
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Temperature Sensor Calibration */}
          <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginTop: 0, color: '#1e293b' }}>🌡️ Temperature Sensor Calibration</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
              Configure the raw ADC value range and temperature thresholds for fire detection.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <InputField 
                label="Raw Value @ Min Temperature (°C)" 
                field="tempRawMin" 
                value={parameters.tempRawMin} 
                error={errors.tempRawMin} 
                onChange={handleInputChange} 
                disabled={!canEdit}
              />
              <InputField 
                label="Raw Value @ Max Temperature (°C)" 
                field="tempRawMax" 
                value={parameters.tempRawMax} 
                error={errors.tempRawMax} 
                onChange={handleInputChange} 
                disabled={!canEdit}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <InputField 
                label="Temperature Warning Threshold (°C)" 
                field="temperatureWarningThreshold" 
                value={parameters.temperatureWarningThreshold} 
                error={errors.temperatureWarningThreshold} 
                onChange={handleInputChange} 
                disabled={!canEdit}
              />
              <InputField 
                label="Temperature Critical Threshold (°C)" 
                field="temperatureCriticalThreshold" 
                value={parameters.temperatureCriticalThreshold} 
                error={errors.temperatureCriticalThreshold} 
                onChange={handleInputChange} 
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Action Buttons */}
          {!canEdit && (
            <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', color: '#334155' }}>
              <strong>Mode hanya lihat:</strong> Anda dapat melihat kalibrasi sensor saat ini, tetapi hanya Petugas/Admin yang dapat mengubahnya.
            </div>
          )}
          {canEdit && (
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
                disabled={saving || loading || hasValidationErrors}
                className={styles.button}
                style={{
                  padding: '0.6rem 1.2rem',
                  backgroundColor: hasValidationErrors ? '#94a3b8' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  cursor: saving || loading || hasValidationErrors ? 'not-allowed' : 'pointer',
                  opacity: saving || loading || hasValidationErrors ? 0.6 : 1,
                  transition: 'background-color 0.2s',
                }}
              >
                {saving ? 'Saving...' : 'Save Calibration'}
              </button>
            </div>
          )}

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
