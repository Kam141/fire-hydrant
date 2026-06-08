import { useState } from 'react';
import Link from 'next/link';
import { ReactNode } from 'react';
import styles from '@/styles/Dashboard.module.css';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import SidebarFrame from '../sidebar';
import NavbarFrame from '../navbar';

interface DashboardFrameProps {
  title: string;
  active: 'dashboard' | 'auto' | 'manual' | 'notif' | 'logs' | 'admin' | 'calibration';
  children: ReactNode;
}


const menus = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { key: 'auto', label: 'Kontrol Otomatis', href: '/auto-control' },
  { key: 'manual', label: 'Kontrol Manual', href: '/manual-control' },
  { key: 'notif', label: 'Notifikasi', href: '/notifications' },
  { key: 'logs', label: 'Log Read', href: '/log-read' },
] as const;

export default function DashboardFrame({ title, active, children }: DashboardFrameProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  
  return (
    <main className={styles.page}>
      <div className={styles.shell}>

        {/* Sidebar */}
        <SidebarFrame active={active} isOpen={isSidebarOpen} onClose={toggleSidebar} />

        <section className={`${styles.workspace} ${!isSidebarOpen ? styles.workspaceExpanded : ''}`}>
          
          {/* Navbar */}
          <NavbarFrame title={title} active={active} onToggleSidebar={toggleSidebar} />

          {/* Content */}
          <div className={styles.workspaceContent}>{children}</div>
        </section>

      </div>
    </main>
  );
}
