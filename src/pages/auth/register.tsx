import Head from 'next/head';
import Link from 'next/link';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/router';
import { registerWithEmail, loginWithGoogle } from '@/lib/firebaseConfig';

type Mode = 'idle' | 'loading' | 'error' | 'success';

export default function RegisterPage() {
  const router = useRouter();
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [mode,      setMode]      = useState<Mode>('idle');
  const [errorMsg,  setErrorMsg]  = useState('');

  function parseFirebaseError(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':    return 'Email sudah terdaftar. Silakan login.';
      case 'auth/invalid-email':           return 'Format email tidak valid.';
      case 'auth/weak-password':           return 'Password terlalu lemah (minimal 6 karakter).';
      case 'auth/network-request-failed':  return 'Gagal terhubung ke jaringan.';
      case 'auth/popup-closed-by-user':    return 'Login Google dibatalkan.';
      default: return 'Terjadi kesalahan. Silakan coba lagi.';
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirm) {
      setErrorMsg('Password dan konfirmasi password tidak cocok.');
      setMode('error');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password minimal 6 karakter.');
      setMode('error');
      return;
    }

    setMode('loading');
    try {
      // registerWithEmail creates the auth user, updates displayName,
      // AND saves the user document to Firestore "users" collection
      await registerWithEmail(email, password, name.trim() || undefined);

      setMode('success');
      setTimeout(() => router.replace('/dashboard'), 1500);
    } catch (err: any) {
      setErrorMsg(parseFirebaseError(err.code));
      setMode('error');
    }
  }

  async function handleGoogleRegister() {
    setMode('loading');
    setErrorMsg('');
    try {
      await loginWithGoogle(); // Google auto-creates user jika belum ada
      router.replace('/dashboard');
    } catch (err: any) {
      setErrorMsg(parseFirebaseError(err.code));
      setMode('error');
    }
  }

  const isLoading = mode === 'loading';

  return (
    <>
      <Head>
        <title>Register — Hydrant Monitor</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow:wght@300;400;600&display=swap" rel="stylesheet" />
      </Head>

      <div style={s.root}>
        <div style={s.grid} aria-hidden />
        <div style={s.blob}  aria-hidden />

        <div style={s.card}>
          {/* Header */}
          <div style={s.header}>
            <div style={s.iconWrap}>
              <span style={{ fontSize: '2rem' }}>🔥</span>
            </div>
            <h1 style={s.title}>HYDRANT MONITOR</h1>
            <p style={s.subtitle}>DAFTAR AKUN BARU</p>
            <div style={s.divider} />
          </div>

          {/* Success banner */}
          {mode === 'success' && (
            <div style={s.successBanner}>
              ✅ Akun berhasil dibuat! Mengalihkan ke dashboard...
            </div>
          )}

          {/* Error banner */}
          {mode === 'error' && (
            <div style={s.errorBanner}>
              <span>⚠</span> {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRegister} style={s.form}>
            <div style={s.fieldGroup}>
              <label style={s.label}>NAMA LENGKAP</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="John Doe"
                disabled={isLoading}
                style={s.input}
                onFocus={e => Object.assign(e.target.style, s.inputFocus)}
                onBlur={e =>  Object.assign(e.target.style, { borderColor: '#1e3a5f', background: '#070d1a' })}
              />
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                disabled={isLoading}
                style={s.input}
                onFocus={e => Object.assign(e.target.style, s.inputFocus)}
                onBlur={e =>  Object.assign(e.target.style, { borderColor: '#1e3a5f', background: '#070d1a' })}
              />
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                required
                disabled={isLoading}
                style={s.input}
                onFocus={e => Object.assign(e.target.style, s.inputFocus)}
                onBlur={e =>  Object.assign(e.target.style, { borderColor: '#1e3a5f', background: '#070d1a' })}
              />
              {/* Password strength bar */}
              {password.length > 0 && (
                <div style={s.strengthWrap}>
                  <div style={{
                    ...s.strengthBar,
                    width:      `${Math.min((password.length / 12) * 100, 100)}%`,
                    background: password.length < 6 ? '#ef4444'
                               : password.length < 10 ? '#f59e0b'
                               : '#22c55e',
                  }} />
                  <span style={s.strengthLabel}>
                    {password.length < 6  ? 'Lemah'
                   : password.length < 10 ? 'Sedang'
                   : 'Kuat'}
                  </span>
                </div>
              )}
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>KONFIRMASI PASSWORD</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Ulangi password"
                required
                disabled={isLoading}
                style={{
                  ...s.input,
                  borderColor: confirm.length > 0
                    ? (confirm === password ? '#22c55e' : '#ef4444')
                    : '#1e3a5f',
                }}
                onFocus={e => Object.assign(e.target.style, s.inputFocus)}
                onBlur={e =>  Object.assign(e.target.style, {
                  borderColor: confirm === password ? '#22c55e' : '#ef4444',
                  background:  '#070d1a',
                })}
              />
              {confirm.length > 0 && (
                <span style={{
                  fontSize: '0.72rem',
                  color: confirm === password ? '#22c55e' : '#ef4444',
                  fontFamily: "'Share Tech Mono', monospace",
                }}>
                  {confirm === password ? '✓ Password cocok' : '✗ Password tidak cocok'}
                </span>
              )}
            </div>

            <button type="submit" disabled={isLoading} style={s.primaryBtn}>
              {isLoading ? (
                <span style={s.loadingDots}>
                  <span>●</span><span>●</span><span>●</span>
                </span>
              ) : 'BUAT AKUN'}
            </button>
          </form>

          {/* OR divider */}
          <div style={s.orRow}>
            <div style={s.orLine} />
            <span style={s.orText}>ATAU</span>
            <div style={s.orLine} />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleRegister}
            disabled={isLoading}
            style={s.googleBtn}
            onMouseEnter={e => Object.assign((e.target as HTMLElement).style, s.googleBtnHover)}
            onMouseLeave={e => Object.assign((e.target as HTMLElement).style, { background: 'transparent', borderColor: '#1e3a5f' })}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            DAFTAR DENGAN GOOGLE
          </button>

          {/* Link to login */}
          <p style={s.loginLink}>
            Sudah punya akun?{' '}
            <Link href="/login" style={s.link}>Masuk di sini</Link>
          </p>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #070d1a; }

        @keyframes blobPulse {
          0%, 100% { transform: scale(1);    opacity: 0.15; }
          50%       { transform: scale(1.15); opacity: 0.25; }
        }
        @keyframes gridScroll {
          from { background-position: 0 0; }
          to   { background-position: 40px 40px; }
        }
        @keyframes loadingBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight:      '100vh',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    background:     '#070d1a',
    fontFamily:     "'Barlow', sans-serif",
    padding:        '1.5rem',
    position:       'relative',
    overflow:       'hidden',
  },
  grid: {
    position:        'absolute',
    inset:           0,
    backgroundImage: 'linear-gradient(#0f2040 1px, transparent 1px), linear-gradient(90deg, #0f2040 1px, transparent 1px)',
    backgroundSize:  '40px 40px',
    animation:       'gridScroll 8s linear infinite',
    opacity:         0.6,
  },
  blob: {
    position:      'absolute',
    top:           '30%',
    left:          '50%',
    transform:     'translateX(-50%)',
    width:         '500px',
    height:        '500px',
    borderRadius:  '50%',
    background:    'radial-gradient(circle, #ff4500 0%, transparent 70%)',
    animation:     'blobPulse 4s ease-in-out infinite',
    pointerEvents: 'none',
  },
  card: {
    position:       'relative',
    zIndex:         1,
    width:          '100%',
    maxWidth:       '420px',
    background:     'rgba(7, 13, 26, 0.92)',
    border:         '1px solid #1e3a5f',
    borderRadius:   '4px',
    padding:        '2.5rem 2rem',
    backdropFilter: 'blur(12px)',
    boxShadow:      '0 0 40px rgba(255, 69, 0, 0.08), 0 0 0 1px rgba(255,255,255,0.03)',
  },
  header: {
    textAlign:    'center',
    marginBottom: '1.75rem',
  },
  iconWrap: {
    display:        'inline-flex',
    alignItems:     'center',
    justifyContent: 'center',
    width:          '56px',
    height:         '56px',
    borderRadius:   '4px',
    background:     'rgba(255, 69, 0, 0.1)',
    border:         '1px solid rgba(255, 69, 0, 0.3)',
    marginBottom:   '1rem',
  },
  title: {
    fontFamily:    "'Share Tech Mono', monospace",
    fontSize:      '1.25rem',
    fontWeight:    400,
    color:         '#e2e8f0',
    letterSpacing: '0.2em',
    marginBottom:  '0.35rem',
  },
  subtitle: {
    fontFamily:    "'Share Tech Mono', monospace",
    fontSize:      '0.65rem',
    color:         '#ff6a35',
    letterSpacing: '0.15em',
    marginBottom:  '1.25rem',
  },
  divider: {
    height:     '1px',
    background: 'linear-gradient(90deg, transparent, #1e3a5f 30%, #ff4500 50%, #1e3a5f 70%, transparent)',
  },
  successBanner: {
    padding:      '0.75rem 1rem',
    background:   'rgba(34, 197, 94, 0.1)',
    border:       '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: '3px',
    color:        '#86efac',
    fontSize:     '0.825rem',
    marginBottom: '1.25rem',
    textAlign:    'center',
  },
  errorBanner: {
    display:      'flex',
    alignItems:   'center',
    gap:          '0.5rem',
    padding:      '0.75rem 1rem',
    background:   'rgba(239, 68, 68, 0.1)',
    border:       '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '3px',
    color:        '#fca5a5',
    fontSize:     '0.825rem',
    marginBottom: '1.25rem',
  },
  form: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '1rem',
  },
  fieldGroup: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.4rem',
  },
  label: {
    fontFamily:    "'Share Tech Mono', monospace",
    fontSize:      '0.65rem',
    color:         '#475569',
    letterSpacing: '0.15em',
  },
  input: {
    background:    '#070d1a',
    border:        '1px solid #1e3a5f',
    borderRadius:  '3px',
    padding:       '0.75rem 1rem',
    color:         '#e2e8f0',
    fontSize:      '0.9rem',
    fontFamily:    "'Barlow', sans-serif",
    outline:       'none',
    transition:    'border-color 0.2s, background 0.2s',
    width:         '100%',
  },
  inputFocus: {
    borderColor: '#ff4500',
    background:  '#0a1628',
  },
  strengthWrap: {
    display:    'flex',
    alignItems: 'center',
    gap:        '0.5rem',
    marginTop:  '0.25rem',
  },
  strengthBar: {
    height:       '3px',
    borderRadius: '2px',
    flex:         1,
    transition:   'width 0.3s, background 0.3s',
    background:   '#ef4444',
  },
  strengthLabel: {
    fontFamily:    "'Share Tech Mono', monospace",
    fontSize:      '0.65rem',
    color:         '#64748b',
    whiteSpace:    'nowrap',
  },
  primaryBtn: {
    marginTop:     '0.5rem',
    padding:       '0.85rem',
    background:    'linear-gradient(135deg, #ff4500, #ff6a35)',
    border:        'none',
    borderRadius:  '3px',
    color:         '#fff',
    fontFamily:    "'Share Tech Mono', monospace",
    fontSize:      '0.85rem',
    letterSpacing: '0.15em',
    cursor:        'pointer',
    width:         '100%',
  },
  loadingDots: {
    display:    'inline-flex',
    gap:        '4px',
    alignItems: 'center',
  },
  orRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        '0.75rem',
    margin:     '1.5rem 0',
  },
  orLine: {
    flex:       1,
    height:     '1px',
    background: '#1e3a5f',
  },
  orText: {
    fontFamily:    "'Share Tech Mono', monospace",
    fontSize:      '0.65rem',
    color:         '#334155',
    letterSpacing: '0.1em',
  },
  googleBtn: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            '0.75rem',
    width:          '100%',
    padding:        '0.8rem',
    background:     'transparent',
    border:         '1px solid #1e3a5f',
    borderRadius:   '3px',
    color:          '#94a3b8',
    fontFamily:     "'Share Tech Mono', monospace",
    fontSize:       '0.75rem',
    letterSpacing:  '0.1em',
    cursor:         'pointer',
    transition:     'background 0.2s, border-color 0.2s',
  },
  googleBtnHover: {
    background:  'rgba(255, 255, 255, 0.04)',
    borderColor: '#2d5a8e',
  },
  loginLink: {
    marginTop:  '1.5rem',
    textAlign:  'center',
    fontSize:   '0.8rem',
    color:      '#475569',
    fontFamily: "'Share Tech Mono', monospace",
  },
  link: {
    color:          '#ff6a35',
    textDecoration: 'none',
  },
};