import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
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

function HeroHydrantScene() {
  return (
    <svg viewBox="0 0 520 340" aria-hidden="true" className={styles.heroArtwork}>
      <defs>
        <linearGradient id="heroBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe8d7" />
          <stop offset="100%" stopColor="#ffd6bf" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#84c9ff" />
          <stop offset="100%" stopColor="#3b8bd1" />
        </linearGradient>
      </defs>

      <rect x="8" y="8" width="504" height="324" rx="24" fill="url(#heroBg)" />
      <circle cx="425" cy="88" r="48" fill="#fff4ea" />
      <path d="M72 244h370" stroke="#d68f72" strokeWidth="12" strokeLinecap="round" />
      <rect x="208" y="150" width="104" height="94" rx="18" fill="#df3e2f" />
      <rect x="190" y="132" width="140" height="28" rx="12" fill="#ef6454" />
      <rect x="228" y="112" width="64" height="24" rx="8" fill="#c83427" />
      <circle cx="260" cy="194" r="23" fill="#fff0e5" stroke="#a22318" strokeWidth="7" />
      <path d="M260 176v36M242 194h36" stroke="#a22318" strokeWidth="7" strokeLinecap="round" />
      <path d="M314 180c43 6 77 22 96 38" stroke="#5aa9eb" strokeWidth="9" strokeLinecap="round" />
      <path d="M391 216c16 11 28 24 34 38" stroke="url(#water)" strokeWidth="11" strokeLinecap="round" />
      <circle cx="431" cy="266" r="20" fill="#9dd5ff" opacity="0.78" />
      <circle cx="116" cy="104" r="8" fill="#f4aa84" />
      <circle cx="140" cy="86" r="6" fill="#f4aa84" />
      <circle cx="164" cy="107" r="5" fill="#f4aa84" />
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
        <div className={styles.shell}>
          <header className={styles.topNav}>
            <div className={styles.brandWrap}>
              <div className={styles.brandMark}>
                <Image
                  src="/logo.png"
                  alt="Hydrant Guard Logo"
                  width={40}
                  height={40}
                  className={styles.brandMarkImg}
                  priority
                />
              </div>
              <div>
                <p className={styles.brandTitle}>Hydrant Guard</p>
                <p className={styles.brandSub}>Smart Fire Monitoring</p>
              </div>
            </div>

            <nav className={styles.navLinks}>
              <a href="#features">Features</a>
              <a href="#about">Workflow</a>
              <a href="#contact">Contact</a>
            </nav>

            <div className={styles.navActions}>
              <Link href="/auth/register" className={styles.signUp}>
                Daftar
              </Link>
            </div>
          </header>

          <div className={styles.sectionStack}>
            <section className={styles.hero}>
              <div className={styles.heroLeft}>
                <p className={styles.kicker}>Emergency-Ready Platform</p>
                <h1>Sistem Monitoring Hydrant untuk Respons Cepat</h1>
                <p>
                  Pantau sensor secara real-time, jalankan auto-control valve, terima notifikasi
                  Telegram, dan baca log Hadoop dalam satu command center.
                </p>
                <div className={styles.ctaRow}>
                  <Link href="/auth/login" className={styles.primaryBtn}>
                    Masuk
                  </Link>
                </div>
                <div className={styles.heroBadge}>Fire-safe operation untuk tim lapangan</div>
              </div>

              {/* <div className={styles.heroRight}>
                <HeroHydrantScene />
              </div> */}
            </section>

            <section id="features" className={styles.panelSection}>
              <div className={styles.sectionHeading}>
                <h2>Fitur Unggulan</h2>
              </div>
              <div className={styles.featureGrid}>
                <article className={styles.featureCard}>
                  <div className={styles.featureIcon}>
                    <FeatureValveIcon />
                  </div>
                  <h3>Automatic Valve System</h3>
                  <p>Katup terbuka saat sensor api meningkat agar distribusi air cepat dan stabil.</p>
                </article>

                <article className={styles.featureCard}>
                  <div className={styles.featureIcon}>
                    <FeatureAlertIcon />
                  </div>
                  <h3>Instant Alert Integration</h3>
                  <p>Peringatan real-time ke Telegram tim pemadam supaya keputusan lebih cepat.</p>
                </article>

                <article className={styles.featureCard}>
                  <div className={styles.featureIcon}>
                    <FeatureMapIcon />
                  </div>
                  <h3>Map-based Location Tracking</h3>
                  <p>Lokasi hydrant terhubung ke data sistem untuk koordinasi darurat yang akurat.</p>
                </article>
              </div>
            </section>

            <section id="about" className={styles.workflowSection}>
              <div className={styles.sectionHeading}>

                <h2>Alur Operasi Hydrant Guard</h2>
              </div>

              <div className={styles.workflowFlow}>
                <article className={styles.stepCard}>
                  <p>Step 1</p>
                  <div className={styles.stepIcon}>
                    <StepSensorIcon />
                  </div>
                  <strong>Sensor Pendeteksi</strong>
                </article>

                <span className={styles.flowArrow} aria-hidden>
                  &rarr;
                </span>

                <article className={styles.stepCard}>
                  <p>Step 2</p>
                  <div className={styles.stepIcon}>
                    <StepControlIcon />
                  </div>
                  <strong>Pusat Command Center</strong>
                </article>

                <span className={styles.flowArrow} aria-hidden>
                  &rarr;
                </span>

                <article className={styles.stepCard}>
                  <p>Step 3</p>
                  <div className={styles.stepIcon}>
                    <StepValveIcon />
                  </div>
                  <strong>Aktuasi Katup</strong>
                </article>

                <span className={styles.flowArrow} aria-hidden>
                  &rarr;
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
          </div>
        </div>

        <footer id="contact" className={styles.premiumFooter}>
          <div className={styles.footerContent}>
            <div className={styles.footerBrand}>
              <div className={styles.footerLogoWrap}>
                <Image src="/logo.png" alt="Hydrant Guard" width={32} height={32} />
                <h3>Hydrant Guard</h3>
              </div>
              <p>Sistem cerdas untuk respons tanggap darurat dan proteksi aset Anda dari bahaya kebakaran secara real-time tersentralisasi dalam satu command center.</p>
            </div>
            
            <div className={styles.footerLinks}>
              <h4>Platform Modules</h4>
              <ul>
                <li><Link href="/dashboard">Dashboard Analytics</Link></li>
                <li><Link href="/auto-control">Automatic Valve Control</Link></li>
                <li><Link href="/manual-control">Manual Control</Link></li>
                <li><Link href="/notifications">Alert & Notifications</Link></li>
                <li><Link href="/log-read">System Audit Logs</Link></li>
              </ul>
            </div>

            <div className={styles.footerContact}>
              <h4>Hubungi Kami</h4>
              <ul>
                <li><strong>Email:</strong> support@hydrantguard.id</li>
                <li><strong>Phone:</strong> +62 811 2345 6789</li>
                <li><strong>Address:</strong> Command Center Lt. 3, Jakarta Selatan</li>
              </ul>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>&copy; {new Date().getFullYear()} Hydrant Guard. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </>
  );
}
