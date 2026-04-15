import Head from 'next/head';
import Link from 'next/link';
import styles from '@/styles/Landing.module.css';

function FeatureValveIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 50h28" />
        <path d="M32 50V34" />
        <path d="M25 34h14l6-9H19z" />
        <path d="M22 24l-4-6" />
        <path d="M42 24l4-6" />
        <path d="M16 18l6 2" />
        <path d="M48 18l-6 2" />
      </g>
    </svg>
  );
}

function FeatureAlertIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="18" y="8" width="28" height="48" rx="6" />
        <rect x="28" y="26" width="20" height="16" rx="4" />
        <path d="M24 16h16" />
        <path d="M34 48h0" />
      </g>
    </svg>
  );
}

function FeatureMapIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 16l14-6 20 6 14-6v38l-14 6-20-6-14 6z" />
        <path d="M22 10v38" />
        <path d="M42 16v38" />
        <path d="M34 25a4 4 0 1 1 8 0c0 3-4 8-4 8s-4-5-4-8z" />
      </g>
    </svg>
  );
}

function StepSensorIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="12" y="9" width="40" height="8" rx="2" />
        <path d="M20 17h24l-3 8H23z" />
        <rect x="25" y="30" width="14" height="14" rx="6" />
        <path d="M17 39c2-3 5-5 8-6" />
        <path d="M47 39c-2-3-5-5-8-6" />
        <path d="M14 46c3-4 7-7 12-8" />
        <path d="M50 46c-3-4-7-7-12-8" />
      </g>
    </svg>
  );
}

function StepControlIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="10" width="48" height="32" rx="3" />
        <path d="M16 18h10M16 24h8M32 18h8M32 24h8" />
        <rect x="44" y="16" width="8" height="10" />
        <circle cx="32" cy="51" r="7" />
        <path d="M25 42h14" />
      </g>
    </svg>
  );
}

function StepValveIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="28" width="44" height="18" rx="3" />
        <path d="M23 28v-8h18v8" />
        <rect x="20" y="13" width="24" height="7" rx="2" />
        <circle cx="32" cy="37" r="6" />
        <path d="M32 34v6M29 37h6" />
      </g>
    </svg>
  );
}

function StepTeamIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 24a6 6 0 0 1 12 0" />
        <path d="M14 52V38h24v14" />
        <path d="M26 24v8" />
        <path d="M44 20c0-3 2-5 4-5s4 2 4 5c0 3-4 8-4 8s-4-5-4-8z" />
        <path d="M46 35c0-3 2-5 4-5s4 2 4 5c0 3-4 8-4 8s-4-5-4-8z" />
      </g>
    </svg>
  );
}

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Hydrant Guard - Home</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.topNav}>
            <div className={styles.brandWrap}>
              <div className={styles.brandMark}>H</div>
              <div>
                <p className={styles.brandTitle}>Hydrant Guard</p>
                <p className={styles.brandSub}>Smart Fire Monitoring</p>
              </div>
            </div>

            <nav className={styles.navLinks}>
              <a href="#features">Features</a>
              <a href="#modules">Modules</a>
              <a href="#about">About</a>
            </nav>


            <div className={styles.navActions}>
              <Link href="/auth/register" className={styles.signUp}>
                Daftar
              </Link>
            </div>
          </header>

          
            <div className={styles.heroLeft}>
              <p className={styles.kicker}>Emergency-Ready Platform</p>
              <h1>
                Sistem Monitoring Hydrant
                <br />
                untuk Respons Cepat
              </h1>
              <p>
                Pantau sensor secara real-time, jalankan auto-control valve, terima notifikasi Telegram,
                dan baca log Hadoop dalam satu command center.
              </p>
              <div className={styles.ctaRow}>
                <Link href="/auth/login" className={styles.primaryBtn}>
                  Masuk
                </Link>
              </div>
              <div className={styles.heroBadge}>Fire-Safe Operation</div>
            </div>


          <section id="features" className={styles.panelSection}>
            <h2>Fitur Unggulan</h2>
            <div className={styles.featureGrid}>
              <article className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <FeatureValveIcon />
                </div>
                <h3>Sistem Katup Otomatis (Automatic Valve System)</h3>
                <p>
                  Katup terbuka saat sensor api meningkat untuk merespon tanda-tanda api dan menjaga distribusi air.
                </p>
              </article>
              
              <article className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <FeatureAlertIcon />
                </div>
                <h3>Integrasi Notifikasi Instan (Instant Alert Integration)</h3>
                <p>
                  Peringatan dikirim secara real-time ke tim pemadam melalui Telegram agar tindakan lebih cepat.
                </p>
              </article>
              
              <article className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <FeatureMapIcon />
                </div>
                <h3>Pelacakan Lokasi Berbasis Peta (Map-Based Location Tracking)</h3>
                <p>Data hydrant terhubung dengan lokasi untuk memudahkan koordinasi tim saat kondisi darurat.</p>
              </article>
            </div>
          </section>

          <section id="about" className={styles.workflowSection}>
            <h2>Bagaimana Cara Kerjanya</h2>
            <div className={styles.workflowFlow}>
              <article className={styles.stepCard}>
                <p>Step 1</p>
                <div className={styles.stepIcon}>
                  <StepSensorIcon />
                </div>
                <strong>Sensor Pendeteksi</strong>
              </article>
              
              <span className={styles.flowArrow} aria-hidden>
                →
              </span>
              
              <article className={styles.stepCard}>
                <p>Step 2</p>
                <div className={styles.stepIcon}>
                  <StepControlIcon />
                </div>
                <strong>Pusat Command Center</strong>
              </article>
              
              <span className={styles.flowArrow} aria-hidden>
                →
              </span>
              
              <article className={styles.stepCard}>
                <p>Step 3</p>
                <div className={styles.stepIcon}>
                  <StepValveIcon />
                </div>
                <strong>Aktuasi Katup</strong>
              </article>
              
              <span className={styles.flowArrow} aria-hidden>
                →
              </span>
              
              <article className={styles.stepCard}>
                <p>Step 4</p>
                <div className={styles.stepIcon}>
                  <StepTeamIcon />
                </div>
                <strong>Tim Pemadam Diluncurkan</strong>
              </article>
            </div>
          </section>

          <section id="modules" className={styles.bottomGrid}>
            <article>
              <h3>Real-time Monitoring</h3>
              <p>Data sensor api, suhu, tekanan, dan flow ditampilkan terus menerus.</p>
            </article>
            
            <article>
              <h3>Automatic Protection</h3>
              <p>Valve terbuka otomatis saat indikator kebakaran melewati ambang batas.</p>
            </article>
            
            <article>
              <h3>Audit and Logs</h3>
              <p>Semua data dicatat periodik ke Hadoop untuk evaluasi dan investigasi.</p>
            </article>
          </section>

          <section className={styles.moduleStrip}>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/auto-control">Kontrol Otomatis</Link>
            <Link href="/manual-control">Kontrol Manual</Link>
            <Link href="/notifications">Notifikasi</Link>
            <Link href="/log-read">Log Read</Link>
          </section>
        </section>
      </main>
    </>
  );
}