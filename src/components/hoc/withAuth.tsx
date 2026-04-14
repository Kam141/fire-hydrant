import { useAuth } from '@/context/AuthContext';
import { ComponentType } from 'react';

export function withAuth<P extends object>(Component: ComponentType<P>) {
  return function ProtectedPage(props: P) {
    const { user, loading } = useAuth();

    if (loading) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0f1e',
          gap: '1.25rem',
        }}>
          {/* Animated fire loader */}
          <div style={{ fontSize: '2.5rem', animation: 'flicker 1s ease-in-out infinite alternate' }}>
            🔥
          </div>
          <p style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.85rem', letterSpacing: '0.1em' }}>
            MEMVERIFIKASI SESI...
          </p>
          <style>{`
            @keyframes flicker {
              0%   { opacity: 0.4; transform: scale(0.95); }
              100% { opacity: 1;   transform: scale(1.05); }
            }
          `}</style>
        </div>
      );
    }

    // onAuthStateChanged will redirect if not authenticated, but guard here too
    if (!user) return null;

    return <Component {...props} />;
  };
}