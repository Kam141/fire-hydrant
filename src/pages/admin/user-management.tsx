import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useAuth } from '@/context/AuthContext';
import { withRoleProtection } from '@/components/hoc/withRoleProtection';
import DashboardFrame from '@/components/layout/dashboard-frame';
import { UserProfile, UserRole } from '@/types/system';
import styles from './user-management.module.css';

function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // States for search, filter and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const roleOptions: UserRole[] = ['admin', 'petugas', 'user'];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken() || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    // Single Admin validation rule
    if (newRole === 'admin') {
      const existingAdmin = users.find(u => u.role === 'admin' && u.uid !== userId);
      if (existingAdmin) {
        setError('Admin utama sudah ditetapkan. Sistem hanya mengizinkan 1 Admin.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    if (userId === user?.uid && newRole !== 'admin') {
      setError('Cannot remove your own admin status');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setUpdating(userId);
      setError(null);

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken() || ''}`,
        },
        body: JSON.stringify({
          userId,
          newRole,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update user role: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setSuccessMessage(result.message);
        await fetchUsers();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    } finally {
      setUpdating(null);
    }
  };

  // Filter, Search, and Pagination Logic
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = 
        (u.displayName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.email?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage) || 1;
  
  // Ensure current page is valid when filtering changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredUsers.slice(start, start + rowsPerPage);
  }, [filteredUsers, currentPage, rowsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getRoleBadge = (role: UserRole) => {
    if (role === 'admin') {
      return (
        <span className={`${styles.badge} ${styles['badge-system-admin']}`}>
          System Administrator
        </span>
      );
    }
    return (
      <span className={`${styles.badge} ${styles[`badge-${role}`]}`}>
        {role}
      </span>
    );
  };

  return (

    

      <DashboardFrame title="MANAJEMEN PENGGUNA" active="admin">
        
        <div className={styles.container}>
          {error && (
            <div className={styles['alert-error']}>
              <span>⚠ {error}</span>
              <button onClick={() => setError(null)}>Tutup</button>
            </div>
          )}

          {successMessage && (
            <div className={styles['alert-success']}>
              <span>✓ {successMessage}</span>
            </div>
          )}

          <div className={styles.tableCard}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
              <div className={styles.controlsRow}>
                <div className={styles.searchBox}>
                  <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Cari nama atau email pengguna..." 
                    className={styles.searchInput}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className={styles.filtersGroup}>
                  <select 
                    className={styles.filterSelect}
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="all">Semua Role</option>
                    <option value="user">User</option>
                    <option value="petugas">Petugas</option>
                    <option value="admin">Admin</option>
                  </select>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Tampilkan:</span>
                    <select 
                      className={styles.perPageSelect}
                      value={rowsPerPage}
                      onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className={styles['loading-spinner']}>
                <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p>Memuat data pengguna...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <>
                <div className={styles.tableWrapper}>
                  {filteredUsers.length === 0 ? (
                    <div className={styles['empty-state']}>
                      <div className={styles['empty-state-icon']}>🔍</div>
                      <p>Tidak ada pengguna yang cocok dengan pencarian Anda.</p>
                    </div>
                  ) : (
                    <table className={styles['users-table']}>
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Nama</th>
                          <th>Peran Saat Ini</th>
                          <th>Ubah Peran</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedUsers.map((userProfile) => (
                          <tr key={userProfile.uid}>
                            <td>
                              <div style={{ fontWeight: 500, color: '#1e293b' }}>{userProfile.email}</div>
                            </td>
                            <td>{userProfile.displayName || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Belum diatur</span>}</td>
                            <td>
                              {getRoleBadge(userProfile.role)}
                            </td>
                            <td>
                              {updating === userProfile.uid ? (
                                <span className={styles['updating']}>
                                  <div style={{ width: '12px', height: '12px', border: '2px solid #cbd5e1', borderTopColor: '#64748b', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                  Memperbarui...
                                </span>
                              ) : (
                                <select
                                  value={userProfile.role}
                                  onChange={(e) => handleRoleChange(userProfile.uid, e.target.value as UserRole)}
                                  disabled={updating === userProfile.uid || userProfile.role === 'admin'}
                                  className={styles['role-select']}
                                  title={userProfile.role === 'admin' ? "Admin utama tidak dapat diubah" : "Ubah peran pengguna"}
                                >
                                  {(() => {
                                    const hasOtherAdmin = users.some(u => u.role === 'admin' && u.uid !== userProfile.uid);
                                    const options: UserRole[] = (userProfile.role === 'admin' || !hasOtherAdmin) 
                                      ? ['admin', 'petugas', 'user'] 
                                      : ['petugas', 'user'];
                                    
                                    return options.map((role) => (
                                      <option key={role} value={role}>
                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                      </option>
                                    ));
                                  })()}
                                </select>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                
                {filteredUsers.length > 0 && (
                  <div className={styles.paginationSection}>
                    <div className={styles.paginationInfo}>
                      Menampilkan {(currentPage - 1) * rowsPerPage + 1} hingga {Math.min(currentPage * rowsPerPage, filteredUsers.length)} dari {filteredUsers.length} pengguna
                    </div>
                    <div className={styles.paginationControls}>
                      <button 
                        className={styles.pageBtn} 
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Prev
                      </button>
                      
                      {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1;
                        // Simple pagination display logic (shows all pages if few, else could be truncated, but keeping simple for now)
                        if (totalPages > 7 && page > 2 && page < totalPages - 1 && Math.abs(page - currentPage) > 1) {
                          if (page === 3 || page === totalPages - 2) return <span key={page} style={{ padding: '0 8px', color: '#94a3b8' }}>...</span>;
                          return null;
                        }
                        
                        return (
                          <button 
                            key={page}
                            className={`${styles.pageBtn} ${currentPage === page ? styles.pageBtnActive : ''}`}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </button>
                        );
                      })}
                      
                      <button 
                        className={styles.pageBtn} 
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </DashboardFrame>

  );
}

export default withRoleProtection(UserManagement);
