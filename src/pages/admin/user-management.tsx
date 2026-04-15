import React, { useState, useEffect } from 'react';
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
    if (userId === user?.uid && newRole !== 'admin') {
      setError('Cannot remove your own admin status');
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

  const getRoleBadgeClass = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return styles['badge-admin'];
      case 'petugas':
        return styles['badge-petugas'];
      case 'user':
        return styles['badge-user'];
      default:
        return styles['badge-user'];
    }
  };

  return (
    <>
      <Head>
        <title>Manajemen Pengguna - Hydrant Monitor</title>
      </Head>

      <DashboardFrame title="MANAJEMEN PENGGUNA" active="admin">
        <div className={styles.container}>
          <div className={styles.header}>
            <h1>Manajemen Pengguna</h1>
            <p>Kelola peran dan izin pengguna</p>
          </div>

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

          {loading ? (
            <div className={styles['loading-spinner']}>
              <div>Loading...</div>
            </div>
          ) : (
            <div className={styles['users-grid']}>
              {users.length === 0 ? (
                <div className={styles['empty-state']}>
                  <p>Tidak ada pengguna ditemukan</p>
                </div>
              ) : (
                <table className={styles['users-table']}>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Nama</th>
                      <th>Peran Saat Ini</th>
                      <th>Ubah Peran</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((userProfile) => (
                      <tr key={userProfile.uid}>
                        <td>{userProfile.email}</td>
                        <td>{userProfile.displayName || '-'}</td>
                        <td>
                          <span className={`${styles.badge} ${getRoleBadgeClass(userProfile.role)}`}>
                            {userProfile.role}
                          </span>
                        </td>
                        <td>
                          <select
                            value={userProfile.role}
                            onChange={(e) => handleRoleChange(userProfile.uid, e.target.value as UserRole)}
                            disabled={updating === userProfile.uid}
                            className={styles['role-select']}
                          >
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {updating === userProfile.uid ? (
                            <span className={styles['updating']}>Memperbarui...</span>
                          ) : userProfile.uid === user?.uid ? (
                            <span className={styles['current-user']}>Anda</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          <div className={styles.info}>
            <h3>Informasi Peran:</h3>
            <ul>
              <li><strong>Admin:</strong> Akses penuh ke semua fitur termasuk manajemen pengguna</li>
              <li><strong>Petugas:</strong> Akses ke kontrol hidran dan diagnostik</li>
              <li><strong>User:</strong> Akses terbatas untuk melihat status sistem</li>
            </ul>
          </div>
        </div>
      </DashboardFrame>
    </>
  );
}

export default withRoleProtection(UserManagement);
