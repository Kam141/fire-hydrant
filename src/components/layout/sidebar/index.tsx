import Link from 'next/link';
import { ReactNode } from 'react';
import styles from '@/styles/Dashboard.module.css';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

interface SidebarFrameProps {
  active: 'dashboard' | 'auto' | 'manual' | 'notif' | 'logs' | 'admin' | 'calibration';
  isOpen: boolean;
  onClose: () => void;
}


const baseMenus = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { key: 'notif', label: 'Notifikasi', href: '/notifications' },
  { key: 'logs', label: 'Log Read', href: '/log-read' },
] as const;

export default function SidebarFrame({ active, isOpen, onClose }: SidebarFrameProps) {
  const { role } = useAuth();
  
  // Add admin menu item if user is admin
  const menus = [
    ...baseMenus,
    ...(role === 'admin' 
      ? [
          { key: 'calibration' as const, label: 'Sensor Calibration', href: '/admin/sensor-calibration' },
          { key: 'admin' as const, label: 'Manajemen Pengguna', href: '/admin/user-management' },
        ]
      : []),
    ...(role === 'admin' || role === 'petugas'
      ? [
          { key: 'auto', label: 'Kontrol Valve', href: '/auto-control' },
          // { key: 'manual', label: 'Kontrol Manual', href: '/manual-control' },
        ]
      : []),
  ];

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
      <div className={styles.headerArea}>
        <div className={styles.logoWrap}>
          <div className={styles.logoBadge}>
            <Image
              src="/logo.png"
              alt="Hydrant Guard Logo"
              width={42}
              height={42}
              className={styles.logoBadgeImg}
              priority
            />
          </div>
          <div className={styles.logoTextGroup}>
            <p className={styles.logoText}>Hydrant Guard</p>
            <p className={styles.logoSub}>Fire Safety Grid</p>
          </div>
        </div>
        <button 
          className={styles.sidebarToggleBtn} 
          onClick={onClose}
          aria-label="Toggle sidebar"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      <nav className={styles.menu}>
        {menus.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={item.key === active ? `${styles.menuLink} ${styles.menuLinkActive}` : styles.menuLink}
          >
            <span className={styles.menuDot} />
            <span className={styles.menuText}>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
