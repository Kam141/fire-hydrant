import Link from 'next/link';
import { ReactNode } from 'react';
import styles from '@/styles/Dashboard.module.css';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

interface SidebarFrameProps {
  active: 'dashboard' | 'auto' | 'manual' | 'notif' | 'logs';
}


const menus = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { key: 'auto', label: 'Kontrol Otomatis', href: '/auto-control' },
  { key: 'manual', label: 'Kontrol Manual', href: '/manual-control' },
  { key: 'notif', label: 'Notifikasi', href: '/notifications' },
  { key: 'logs', label: 'Log Read', href: '/log-read' },
] as const;

export default function SidebarFrame({ active }: SidebarFrameProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoWrap}>
        <div className={styles.logoBadge}>H</div>
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
