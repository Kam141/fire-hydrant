'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from './log-simulator.module.css';

interface FormData {
  timestamp: string;
  temperatureC: number;
  firePercent: number;
  pressureBar: number;
  flowRateLpm: number;
  waterLevelPercent: number;
  valveOpen: boolean;
  controlMode: 'AUTO' | 'MANUAL';
  alertLevel: 'NORMAL' | 'POTENSI_KEBAKARAN' | 'KEBAKARAN';
}

const initialFormData: FormData = {
  timestamp: new Date().toISOString(),
  temperatureC: 25,
  firePercent: 0,
  pressureBar: 1.0,
  flowRateLpm: 0,
  waterLevelPercent: 100,
  valveOpen: false,
  controlMode: 'AUTO',
  alertLevel: 'NORMAL',
};

export default function LogSimulator() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : type === 'number' || type === 'range'
            ? parseFloat(value)
            : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // Validate sensor values
      if (formData.temperatureC < 0 || formData.temperatureC > 100) {
        throw new Error('Suhu harus antara 0-100°C');
      }
      if (formData.firePercent < 0 || formData.firePercent > 100) {
        throw new Error('Persentase api harus antara 0-100%');
      }
      if (formData.waterLevelPercent < 0 || formData.waterLevelPercent > 100) {
        throw new Error('Level air harus antara 0-100%');
      }
      if (formData.pressureBar < 0 || formData.pressureBar > 10) {
        throw new Error('Tekanan harus antara 0-10 bar');
      }
      if (formData.flowRateLpm < 0 || formData.flowRateLpm > 500) {
        throw new Error('Laju alir harus antara 0-500 lpm');
      }

      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          log: formData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: 'Log berhasil dikirim ke cluster Hadoop! ✓',
        });
        // Reset form after successful submission
        setTimeout(() => {
          setFormData({
            ...initialFormData,
            timestamp: new Date().toISOString(),
          });
        }, 1000);
      } else {
        throw new Error(data.error || 'Gagal mengirim log');
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Gagal mengirim log'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const fillRandomValues = () => {
    setFormData({
      ...formData,
      timestamp: new Date().toISOString(),
      temperatureC: Math.random() * 60 + 20, // 20-80°C
      firePercent: Math.random() * 20, // 0-20%
      pressureBar: Math.random() * 2 + 1, // 1-3 bar
      flowRateLpm: Math.random() * 100, // 0-100 lpm
      waterLevelPercent: Math.random() * 30 + 70, // 70-100%
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📊 Log Simulator - Hadoop Cluster</h1>
        <p>Simulasikan pengiriman log sensor ke cluster Hadoop Anda</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formSection}>
          <h2>📅 Informasi Waktu</h2>
          <div className={styles.formGroup}>
            <label htmlFor="timestamp">Timestamp (ISO 8601):</label>
            <input
              type="datetime-local"
              id="timestamp"
              name="timestamp"
              value={formData.timestamp.split('T').slice(0, 2).join('T')}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  timestamp: new Date(e.target.value).toISOString(),
                }));
              }}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.formSection}>
          <h2>🌡️ Data Sensor</h2>

          <div className={styles.twoColumn}>
            <div className={styles.formGroup}>
              <label htmlFor="temperatureC">
                Suhu (°C):
                <span className={styles.value}>{formData.temperatureC.toFixed(2)}</span>
              </label>
              <input
                type="range"
                id="temperatureC"
                name="temperatureC"
                min="0"
                max="100"
                step="0.1"
                value={formData.temperatureC}
                onChange={handleInputChange}
                className={styles.slider}
              />
              <input
                type="number"
                name="temperatureC"
                min="0"
                max="100"
                step="0.1"
                value={formData.temperatureC}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="firePercent">
                Deteksi Api (%):
                <span className={styles.value}>{formData.firePercent.toFixed(2)}</span>
              </label>
              <input
                type="range"
                id="firePercent"
                name="firePercent"
                min="0"
                max="100"
                step="0.1"
                value={formData.firePercent}
                onChange={handleInputChange}
                className={styles.slider}
              />
              <input
                type="number"
                name="firePercent"
                min="0"
                max="100"
                step="0.1"
                value={formData.firePercent}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.twoColumn}>
            <div className={styles.formGroup}>
              <label htmlFor="pressureBar">
                Tekanan (bar):
                <span className={styles.value}>{formData.pressureBar.toFixed(2)}</span>
              </label>
              <input
                type="range"
                id="pressureBar"
                name="pressureBar"
                min="0"
                max="10"
                step="0.1"
                value={formData.pressureBar}
                onChange={handleInputChange}
                className={styles.slider}
              />
              <input
                type="number"
                name="pressureBar"
                min="0"
                max="10"
                step="0.1"
                value={formData.pressureBar}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="flowRateLpm">
                Laju Alir (LPM):
                <span className={styles.value}>{formData.flowRateLpm.toFixed(2)}</span>
              </label>
              <input
                type="range"
                id="flowRateLpm"
                name="flowRateLpm"
                min="0"
                max="500"
                step="1"
                value={formData.flowRateLpm}
                onChange={handleInputChange}
                className={styles.slider}
              />
              <input
                type="number"
                name="flowRateLpm"
                min="0"
                max="500"
                step="1"
                value={formData.flowRateLpm}
                onChange={handleInputChange}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="waterLevelPercent">
              Level Air (%):
              <span className={styles.value}>{formData.waterLevelPercent.toFixed(2)}</span>
            </label>
            <input
              type="range"
              id="waterLevelPercent"
              name="waterLevelPercent"
              min="0"
              max="100"
              step="0.1"
              value={formData.waterLevelPercent}
              onChange={handleInputChange}
              className={styles.slider}
            />
            <input
              type="number"
              name="waterLevelPercent"
              min="0"
              max="100"
              step="0.1"
              value={formData.waterLevelPercent}
              onChange={handleInputChange}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.formSection}>
          <h2>🎛️ Status Sistem</h2>

          <div className={styles.twoColumn}>
            <div className={styles.formGroup}>
              <label htmlFor="valveOpen">
                <input
                  type="checkbox"
                  id="valveOpen"
                  name="valveOpen"
                  checked={formData.valveOpen}
                  onChange={handleInputChange}
                  className={styles.checkbox}
                />
                Valve Terbuka
              </label>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="controlMode">Mode Kontrol:</label>
              <select
                id="controlMode"
                name="controlMode"
                value={formData.controlMode}
                onChange={handleInputChange}
                className={styles.select}
              >
                <option value="AUTO">AUTO</option>
                <option value="MANUAL">MANUAL</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="alertLevel">Level Alert:</label>
            <select
              id="alertLevel"
              name="alertLevel"
              value={formData.alertLevel}
              onChange={handleInputChange}
              className={styles.select}
            >
              <option value="NORMAL">NORMAL 🟢</option>
              <option value="POTENSI_KEBAKARAN">POTENSI_KEBAKARAN 🟡</option>
              <option value="KEBAKARAN">KEBAKARAN 🔴</option>
            </select>
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            onClick={fillRandomValues}
            className={styles.buttonSecondary}
            disabled={loading}
          >
            🎲 Isi Nilai Random
          </button>
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? '⏳ Mengirim...' : '📤 Kirim Log ke Hadoop'}
          </button>
        </div>

        {result && (
          <div
            className={`${styles.result} ${
              result.success ? styles.resultSuccess : styles.resultError
            }`}
          >
            <p>{result.message}</p>
          </div>
        )}
      </form>

      <div className={styles.info}>
        <h3>📌 Informasi Konfigurasi</h3>
        <ul>
          <li>
            <strong>NameNode:</strong> Konfigurasi di .env.local (HADOOP_NAMENODE_IP)
          </li>
          <li>
            <strong>DataNodes:</strong> 3 node dengan IP dari .env.local
          </li>
          <li>
            <strong>Port Default:</strong> 9870 (dapat disesuaikan via HADOOP_NAMENODE_PORT)
          </li>
          <li>
            <strong>Path Log:</strong> Dapat disesuaikan via HADOOP_LOG_PATH
          </li>
        </ul>
      </div>
    </div>
  );
}
