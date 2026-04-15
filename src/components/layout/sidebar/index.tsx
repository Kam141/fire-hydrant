import Link from 'next/link';
import { ReactNode } from 'react';
import styles from '@/styles/Dashboard.module.css';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

interface SidebarFrameProps {
  active: 'dashboard' | 'auto' | 'manual' | 'notif' | 'logs' | 'admin' | 'parameters';
}


const baseMenus = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { key: 'notif', label: 'Notifikasi', href: '/notifications' },
  { key: 'logs', label: 'Log Read', href: '/log-read' },
] as const;

export default function SidebarFrame({ active }: SidebarFrameProps) {
  const { role } = useAuth();
  
  // Add admin menu item if user is admin
  const menus = [
    ...baseMenus,
    ...(role === 'admin' 
      ? [{ key: 'admin' as const, label: 'Manajemen Pengguna', href: '/admin/user-management' }]
      : []),
    ...(role === 'admin' || role === 'petugas'
      ? [
          { key: 'auto', label: 'Kontrol Otomatis', href: '/auto-control' },
          { key: 'manual', label: 'Kontrol Manual', href: '/manual-control' },
          { key: 'parameters' as const, label: 'Parameter Sensor', href: '/parameters' },
        ]
      : []),
  ];

  return (
    <aside className={styles.sidebar}>
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
        <div>
          <p className={styles.logoText}>Hydrant Guard</p>
          <p className={styles.logoSub}>Fire Safety Grid</p>
        </div>
      </div>

      <nav className={styles.menu}>
        {menus.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={item.key === active ? `${styles.menuLink} ${styles.menuLinkActive}` : styles.menuLink}
          >
            <span className={styles.menuDot} />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
