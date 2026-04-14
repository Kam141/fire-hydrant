import styles from './navbar.module.css';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignIn = () => {
    router.push('/auth/login');
  };

  return (
    <div className={styles.navbar}>
      <div className={styles.navbar__brand}>
        Hydrant Monitor
      </div>

      <div className={styles.navbar__right}>
        {user ? (
          <>
            <div className={styles.navbar__user}>
              <span>Welcome, {user.displayName ?? user.email}</span>
              {user.photoURL && (
                <div className={styles.navbar__user__image_wrapper}>
                  <Image
                    width={36}
                    height={36}
                    src={user.photoURL}
                    alt="User avatar"
                    priority={false}
                    className={styles.navbar__user__image}
                  />
                </div>
              )}
            </div>
            <button
              className={`${styles.navbar__button} ${styles['navbar__button--danger']}`}
              onClick={signOut}
            >
              Sign Out
            </button>
          </>
        ) : (
          <button
            className={`${styles.navbar__button} ${styles['navbar__button--primary']}`}
            onClick={handleSignIn}
          >
            Sign In
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;