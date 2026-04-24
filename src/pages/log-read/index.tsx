import Head from 'next/head';
import { useEffect, useState } from 'react';
import DashboardFrame from '@/components/layout/dashboard-frame';
import StatusPill from '@/components/ui/status-pill';
import styles from '@/styles/Dashboard.module.css';
import { SensorLogEntry } from '@/types/system';

export default function LogReadPage() {
  const [logs, setLogs] = useState<SensorLogEntry[]>([]);
  const [filterType, setFilterType] = useState<'date' | 'status'>('date');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10);

  const loadLogs = async () => {
    const response = await fetch('/api/logs?limit=500');
    const payload = await response.json();
    if (payload.ok) setLogs(payload.data as SensorLogEntry[]);
  };

  useEffect(() => {
    loadLogs();
    const timer = setInterval(loadLogs, 10_000);
    return () => clearInterval(timer);
  }, []);

  const filteredLogs = logs.filter(item => {
    let isValid = true;
    
    if (filterType === 'date') {
      const logTime = new Date(item.timestamp).getTime();
      if (startDate) {
        isValid = isValid && logTime >= new Date(startDate).getTime();
      }
      if (endDate) {
        isValid = isValid && logTime <= new Date(endDate).getTime();
      }
    } else if (filterType === 'status') {
      if (statusFilter) {
        isValid = isValid && item.alertLevel.toLowerCase() === statusFilter.toLowerCase();
      }
    }

    return isValid;
  });

  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const startIndex = itemsPerPage === 'all' ? 0 : (currentPage - 1) * itemsPerPage;
  const currentLogs = itemsPerPage === 'all' ? filteredLogs : filteredLogs.slice(startIndex, startIndex + (itemsPerPage as number));

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <>
      <Head>
        <title>Log Read - Hydrant Monitor</title>
      </Head>

      <DashboardFrame title="LOG READ" active="logs">
        <section className={styles.panelCard}>
          <div className={styles.panelHeaderRow} style={{ marginBottom: '1rem', borderBottom: '1px solid #eaeaea', paddingBottom: '1rem' }}>
            <div>
              <h2>Hadoop Sensor Log</h2>
              <p>Data sensor dikirim otomatis setiap 1 menit dan dibaca ulang ke dashboard.</p>
            </div>
            <button onClick={loadLogs} className={styles.button} style={{ padding: '0.6rem 1.2rem', backgroundColor: '#e2e8f0', color: '#334155', fontWeight: 600 }}>
              Refresh Log
            </button>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '1.2rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '1.2rem', alignItems: 'flex-end', flexWrap: 'wrap', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '150px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Filter Berdasarkan:</label>
              <select 
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value as 'date' | 'status');
                  setCurrentPage(1);
                }}
                style={{ padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: 'white', cursor: 'pointer' }}
              >
                <option value="date">Rentang Waktu</option>
                <option value="status">Status (Alert Level)</option>
              </select>
            </div>

            {filterType === 'date' ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1', minWidth: '200px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Tanggal & Waktu Mulai:</label>
                  <input 
                    type="datetime-local" 
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{ padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: 'white' }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1', minWidth: '200px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Tanggal & Waktu Selesai:</label>
                  <input 
                    type="datetime-local" 
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    style={{ padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: 'white' }}
                  />
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1', minWidth: '200px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Pilih Status:</label>
                <select 
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: 'white', cursor: 'pointer' }}
                >
                  <option value="">Semua Status</option>
                  <option value="NORMAL">Safe</option>
                  <option value="POTENSI_KEBAKARAN">Warning</option>
                  <option value="KEBAKARAN">Critical</option>
                </select>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); setStatusFilter(''); setCurrentPage(1); }} 
                className={`${styles.button} ${styles.ghost}`}
                style={{ 
                  padding: '0.6rem 1.2rem', 
                  fontSize: '0.9rem', 
                  backgroundColor: startDate || endDate || statusFilter ? '#fee2e2' : '#f1f5f9',
                  color: startDate || endDate || statusFilter ? '#ef4444' : '#94a3b8',
                  border: startDate || endDate || statusFilter ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                  cursor: startDate || endDate || statusFilter ? 'pointer' : 'not-allowed',
                  opacity: startDate || endDate || statusFilter ? 1 : 0.7
                }}
                disabled={!startDate && !endDate && !statusFilter}
                title="Hapus Filter"
              >
                Reset Filter
              </button>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Api (%)</th>
                  <th>Suhu (C)</th>
                  <th>Tekanan</th>
                  <th>Flow</th>
                  <th>Valve</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                      {logs.length === 0 ? 'Belum ada log.' : 'Data tidak ditemukan.'}
                    </td>
                  </tr>
                )}
                {currentLogs.map((item) => (
                  <tr key={`${item.timestamp}-${item.firePercent}`}>
                    <td>{new Date(item.timestamp).toLocaleString('id-ID')}</td>
                    <td>{item.firePercent.toFixed(1)}</td>
                    <td>{item.temperatureC.toFixed(1)}</td>
                    <td>{item.pressureBar.toFixed(2)}</td>
                    <td>{item.flowRateLpm.toFixed(0)} L/min</td>
                    <td>{item.valveOpen ? 'Open' : 'Closed'}</td>
                    <td>
                      <StatusPill level={item.alertLevel} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {(logs.length > 0 || startDate !== '' || endDate !== '' || statusFilter !== '') && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0 1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#666' }}>Tampilkan:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setItemsPerPage(val === 'all' ? 'all' : Number(val));
                      setCurrentPage(1);
                    }}
                    style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value="all">Semua</option>
                  </select>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>
                  Menampilkan {filteredLogs.length === 0 ? 0 : startIndex + 1}-{itemsPerPage === 'all' ? filteredLogs.length : Math.min(startIndex + itemsPerPage, filteredLogs.length)} dari {filteredLogs.length} log
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                <button 
                  onClick={handlePrevPage} 
                  disabled={currentPage === 1}
                  className={`${styles.button} ${styles.ghost}`}
                  style={{ opacity: currentPage === 1 ? 0.5 : 1, padding: '0.2rem 0.6rem', fontSize: '1rem', minWidth: '40px' }}
                  title="Halaman Sebelumnya"
                >
                  &laquo;
                </button>
                {getPageNumbers().map((pageNum, index) => (
                  <button
                    key={index}
                    onClick={() => typeof pageNum === 'number' && setCurrentPage(pageNum)}
                    className={`${styles.button} ${typeof pageNum === 'number' && pageNum === currentPage ? '' : styles.ghost}`}
                    style={{ 
                      opacity: pageNum === '...' ? 0.7 : 1,
                      cursor: pageNum === '...' ? 'default' : 'pointer',
                      padding: '0.3rem 0.6rem',
                      minWidth: '40px'
                    }}
                    disabled={pageNum === '...'}
                  >
                    {pageNum}
                  </button>
                ))}
                <button 
                  onClick={handleNextPage} 
                  disabled={currentPage >= totalPages}
                  className={`${styles.button} ${styles.ghost}`}
                  style={{ opacity: currentPage >= totalPages ? 0.5 : 1, padding: '0.2rem 0.6rem', fontSize: '1rem', minWidth: '40px' }}
                  title="Halaman Selanjutnya"
                >
                  &raquo;
                </button>
              </div>
            </div>
          )}
        </section>
      </DashboardFrame>
    </>
  );
}
