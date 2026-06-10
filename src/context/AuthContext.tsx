import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, onAuthStateChanged, logout, User, getUserProfile } from '@/lib/firebaseConfig';
import { useRouter } from 'next/router';
import { UserRole } from '@/types/system';

// Pages that don't require authentication
const PUBLIC_ROUTES = ['/auth/login', '/auth/register', '/'];

interface AuthContextValue {
  user:         User | null;
  role:         UserRole | null;
  loading:      boolean;
  signOut:      () => Promise<void>;
  refreshUser:  () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user:    null,
  role:    null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [role,    setRole]    = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Fetch user role from Firestore if user exists
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        setRole(profile?.role || 'user');
      } else {
        setRole(null);
      }
      
      setLoading(false);

      const isPublic = PUBLIC_ROUTES.includes(router.pathname);

      if (!firebaseUser && !isPublic) {
        // Not logged in → redirect to login
        router.replace('/auth/login');
      }

      if (firebaseUser && isPublic) {
        // Already logged in → redirect to dashboard
        router.replace('/dashboard');
      }
    });

    return () => unsubscribe();
  }, [router.pathname]);

  const signOut = async () => {
    await logout();
    setRole(null);
    router.replace('/auth/login');
  };

  const refreshUser = async () => {
    if (!auth.currentUser) return;

    try {
      await auth.currentUser.reload();
      setUser(auth.currentUser);
    } catch (error) {
      console.error('Error refreshing auth user:', error);
      setUser({ ...auth.currentUser } as User);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}