import { useState, useRef, useEffect } from 'react';
import styles from '@/styles/Dashboard.module.css';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProfileModal from '@/components/profile/ProfileModal';

interface NavbarFrameProps {
  title: string;
  active:
    | 'dashboard'
    | 'auto'
    | 'manual'
    | 'notif'
    | 'logs'
    | 'admin'
    | 'calibration';
  onToggleSidebar?: () => void;
}

export default function NavbarFrame({ title, active, onToggleSidebar }: NavbarFrameProps) {
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 2. Inisialisasi router
  const router = useRouter(); 

  // 3. Buat fungsi handler untuk sign out
  const handleSignOut = async () => {
    try {
      await signOut(); 
      router.push('/'); 
    } catch (error) {
      console.error("Gagal sign out:", error);
    }
  };

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
    <>
      <header className={styles.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <h1>{active === 'dashboard' ? 'Dashboard' : title}</h1>
            <p className={styles.topbarSub}>Real-time hydrant monitoring and control center</p>
          </div>
        </div>

        <div className={styles.userBadgeWrap} ref={dropdownRef}>
          <div 
            className={styles.userBadge} 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            role="button"
            tabIndex={0}
          >

            
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
              <div className={styles.avatarInitials}>
                {user?.displayName?.charAt(0).toUpperCase() || 'A'}
              </div>
            )}

            <div>
              <p className={styles.userName}>{user?.displayName || 'Admin'}</p>
              <p className={styles.userMail}>{user?.email || 'admin@gmail.com'}</p>
            </div>
          </div>

          {dropdownOpen && (
            <div className={styles.dropdownMenu}>
              <button 
                className={styles.dropdownItem} 
                onClick={() => {
                  setDropdownOpen(false);
                  setIsProfileModalOpen(true);
                }}
              >
                Profile
              </button>
              <div className={styles.dropdownDivider} />
              <button className={styles.dropdownItemDanger} onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>
      
      {isProfileModalOpen && (
        <ProfileModal onClose={() => setIsProfileModalOpen(false)} />
      )}
    </>
  );
}
