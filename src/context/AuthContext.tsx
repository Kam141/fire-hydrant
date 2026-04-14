import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, onAuthStateChanged, logout, User } from '@/lib/firebaseConfig';
import { useRouter } from 'next/router';

// Pages that don't require authentication
const PUBLIC_ROUTES = ['/auth/login', '/auth/register'];

interface AuthContextValue {
  user:         User | null;
  loading:      boolean;
  signOut:      () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user:    null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
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
    router.replace('/auth/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}