import { useState, useRef, useEffect } from 'react';
import styles from '@/styles/Dashboard.module.css';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import Link from 'next/link';

interface NavbarFrameProps {
  title: string;
  active: 'dashboard' | 'auto' | 'manual' | 'notif' | 'logs';
}

export default function NavbarFrame({ title, active }: NavbarFrameProps) {
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={styles.topbar}>
      <div>
        <h1>{active === 'dashboard' ? 'Dashboard Overview' : title}</h1>
        <p className={styles.topbarSub}>Real-time hydrant monitoring and control center</p>
      </div>

      <div className={styles.userBadgeWrap} ref={dropdownRef}>
        <div 
          className={styles.userBadge} 
          onClick={() => setDropdownOpen(!dropdownOpen)}
          role="button"
          tabIndex={0}
        >
          <span className={styles.bell} aria-hidden>
            !
          </span>
          
          {user?.photoURL ? (
            <div className={styles.avatarWrap}>
              <Image
                width={33}
                height={33}
                src={user.photoURL}
                alt="User avatar"
                priority={false}
                className={styles.avatarImg}
              />
            </div>
          ) : (
            <div className={styles.avatar} />
          )}

          <div>
            <p className={styles.userName}>{user?.displayName || 'Admin'}</p>
            <p className={styles.userMail}>{user?.email || 'admin@gmail.com'}</p>
          </div>
        </div>

        {dropdownOpen && (
          <div className={styles.dropdownMenu}>
            <Link href="/profile" className={styles.dropdownItem}>
              Profile
            </Link>
            <Link href="/settings" className={styles.dropdownItem}>
              Settings
            </Link>
            <div className={styles.dropdownDivider} />
            <button className={styles.dropdownItemDanger} onClick={signOut}>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
