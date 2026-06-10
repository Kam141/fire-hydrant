import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform, useInView, Variants } from 'framer-motion';
import { 
  Activity, Bell, Wifi, BarChart3, ShieldCheck, 
  Droplets, ArrowRight, CheckCircle2, MapPin, Thermometer, 
  PlayCircle, Menu, X, Star,
  Flame, Wind
} from 'lucide-react';
import styles from '@/styles/Landing.module.css';

// Animation Variants
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } }
};

// Counter Component
const AnimatedCounter = ({ from, to, duration = 2, suffix = "" }: { from: number, to: number, duration?: number, suffix?: string }) => {
  const [count, setCount] = useState(from);
  const nodeRef = useRef(null);
  const inView = useInView(nodeRef, { once: true, margin: "-100px" });

  useEffect(() => {
    if (inView) {
      let startTime: number;
      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
        setCount(Math.floor(progress * (to - from) + from));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    }
  }, [inView, from, to, duration]);

  return <span ref={nodeRef}>{count}{suffix}</span>;
};

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const { scrollYProgress } = useScroll();
  const yHero = useTransform(scrollYProgress, [0, 1], [0, 300]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={styles.page}>
      <Head>
        <title>Hydrant Guard | Smart Fire Monitoring</title>
        <meta name="description" content="Enterprise IoT Fire Hydrant Monitoring System" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.bgEffects}>
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, -50, 0] }} 
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className={styles.blob1} 
        />
        <motion.div 
          animate={{ x: [0, -50, 0], y: [0, 50, 0] }} 
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className={styles.blob2} 
        />
      </div>

      {/* Navbar */}
      <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <div className={styles.container}>
          <div className={styles.navInner}>
            <Link href="/" className={styles.logo}>
              <Image src="/logo.png" alt="HydrantGuard Logo" width={32} height={32} className={styles.logoImg} />
              <span>HydrantGuard</span>
            </Link>

            <div className={styles.navLinks}>
              <Link href="#features" className={styles.navLink}>Features</Link>
              <Link href="#monitoring" className={styles.navLink}>Monitoring</Link>
              <Link href="#how-it-works" className={styles.navLink}>How it Works</Link>
              <Link href="#benefits" className={styles.navLink}>Benefits</Link>
            </div>

            <div className={styles.navActions}>
              <Link href="/auth/register" className={`${styles.btn} ${styles.btnSecondary}`}>Register</Link>
              <Link href="/auth/login" className={`${styles.btn} ${styles.btnPrimary}`}>
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <motion.div 
              initial="hidden" 
              animate="visible" 
              variants={staggerContainer}
              className={styles.heroLeft}
            >
              <motion.div variants={fadeUp} className={styles.heroBadge}>
                <ShieldCheck size={16} /> Smart IoT Fire Protection System
              </motion.div>
              <motion.h1 variants={fadeUp}>
                Monitor Fire Hydrants in Real-Time Before Emergencies Happen
              </motion.h1>
              <motion.p variants={fadeUp}>
                Integrated smoke sensors, hydrant monitoring, and intelligent alert systems that help organizations detect potential fire hazards instantly.
              </motion.p>
              <motion.div variants={fadeUp} className={styles.heroActions}>
                <Link href="/auth/register" className={`${styles.btn} ${styles.btnPrimary}`}>
                  Get Started <ArrowRight size={18} />
                </Link>
              </motion.div>
              <motion.div variants={fadeUp} className={styles.trustIndicators}>
                <div className={styles.trustItem}><CheckCircle2 className={styles.trustIcon} size={18} /> Real-Time Monitoring</div>
                <div className={styles.trustItem}><CheckCircle2 className={styles.trustIcon} size={18} /> Smart Alerts</div>
                <div className={styles.trustItem}><CheckCircle2 className={styles.trustIcon} size={18} /> IoT Integration</div>
                <div className={styles.trustItem}><CheckCircle2 className={styles.trustIcon} size={18} /> Cloud Dashboard</div>
              </motion.div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className={styles.heroRight}
            >
              <div className={styles.realisticDashboard}>
                <div className={styles.dashHeader}>
                   <div className={styles.dashDots}><span></span><span></span><span></span></div>
                   <div className={styles.dashTitle}>HydrantGuard OS</div>
                </div>
                <div className={styles.dashBody}>
                   <div className={styles.dashSidebarSmall}>
                     <div className={styles.dashIconActive}></div>
                     <div className={styles.dashIcon}></div>
                     <div className={styles.dashIcon}></div>
                   </div>
                   <div className={styles.dashContent}>
                     <div className={styles.dashTopWidgets}>
                       <div className={styles.dashWidgetCard}>
                         <div className={styles.dashWidgetLabel}>Water Pressure</div>
                         <div className={styles.dashWidgetValue}>124 PSI <Droplets size={20} color="#06B6D4"/></div>
                       </div>
                       <div className={styles.dashWidgetCard}>
                         <div className={styles.dashWidgetLabel}>Active Devices</div>
                         <div className={styles.dashWidgetValue}>248 <Wifi size={20} color="#10B981"/></div>
                       </div>
                     </div>
                     <div className={styles.dashChartArea}>
                       <div className={styles.dashChartHeader}>System Health</div>
                       <div className={styles.dashChartBars}>
                         {[40,70,45,90,65,85,120,95,110,80].map((h, i) => (
                           <div key={i} className={styles.dashBar} style={{height: `${h/1.5}%`}}></div>
                         ))}
                       </div>
                     </div>
                   </div>
                </div>
              </div>

              {/* Floating Elements */}
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className={`${styles.floatingElement} ${styles.float1}`}>
                <MapPin size={16} color="#06B6D4" /> Hydrant H-42 Active
              </motion.div>
              <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className={`${styles.floatingElement} ${styles.float2}`}>
                <Activity size={16} color="#10B981" /> System Nominal
              </motion.div>
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 2 }} className={`${styles.floatingElement} ${styles.float3}`}>
                <Bell size={16} color="#DC2626" /> Alert System Ready
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.section}>
        <div className={styles.container}>
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className={styles.sectionHeader}
          >
            <h2>Enterprise-Grade Features</h2>
            <p>Everything you need to manage and monitor your fire protection infrastructure intelligently.</p>
          </motion.div>

          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className={styles.featuresGrid}
          >
            {[
              { icon: Activity, title: "Real-Time Monitoring", desc: "Monitor hydrant conditions, water pressure, and smoke detection instantly." },
              { icon: Bell, title: "Smart Alert System", desc: "Receive immediate multi-channel notifications when anomalies occur." },
              { icon: Wifi, title: "IoT Sensor Integration", desc: "Connect multiple monitoring devices into one robust, reliable platform." },
              { icon: BarChart3, title: "Data Analytics", desc: "Track hydrant performance, system health, and historical incident data." }
            ].map((feature, i) => (
              <motion.div key={i} variants={scaleIn} className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <feature.icon size={28} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Live Monitoring Preview Section */}
      <section id="monitoring" className={`${styles.section} ${styles.dashboardPreviewSection}`}>
        <div className={styles.container}>
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className={styles.sectionHeader}
          >
            <h2>Complete Visibility & Control</h2>
            <p>Experience the power of our real-time centralized command dashboard.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className={styles.dashboardPreview}
          >
            <div className={styles.dashSidebar}>
              <div style={{height: 24, width: '60%', background: '#CBD5E1', borderRadius: 4, marginBottom: 40}}></div>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{height: 16, width: i%2===0?'80%':'100%', background: '#E2E8F0', borderRadius: 4, marginBottom: 20}}></div>
              ))}
            </div>
            <div className={styles.dashMain}>
              <div className={styles.dashWidgets}>
                <div className={styles.dashWidget}>
                  <div className={styles.dashWidgetHeader}>
                    <span>Water Pressure</span>
                    <Droplets size={18} color="#06B6D4" />
                  </div>
                  <div className={styles.dashWidgetValue}>124 PSI</div>
                  <div style={{marginTop: 8, fontSize: '0.8rem', color: '#10B981'}}>+2.4% vs last hour</div>
                </div>
                <div className={styles.dashWidget}>
                  <div className={styles.dashWidgetHeader}>
                    <span>Active Devices</span>
                    <Wifi size={18} color="#10B981" />
                  </div>
                  <div className={styles.dashWidgetValue}>248</div>
                  <div style={{marginTop: 8, fontSize: '0.8rem', color: '#64748B'}}>All sensors online</div>
                </div>
                <div className={styles.dashWidget}>
                  <div className={styles.dashWidgetHeader}>
                    <span>Avg Temperature</span>
                    <Thermometer size={18} color="#EA580C" />
                  </div>
                  <div className={styles.dashWidgetValue}>28°C</div>
                  <div style={{marginTop: 8, fontSize: '0.8rem', color: '#10B981'}}>Normal range</div>
                </div>
              </div>
              <div className={styles.dashChart}>
                <div style={{height: 24, width: 150, background: '#CBD5E1', borderRadius: 4, marginBottom: 24}}></div>
                <div style={{display: 'flex', alignItems: 'flex-end', gap: 12, height: 300, paddingBottom: 20, borderBottom: '1px solid #E2E8F0'}}>
                  {[40, 70, 45, 90, 65, 85, 120, 95, 110, 80, 100, 130].map((h, i) => (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${(h/130)*100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: i * 0.05 }}
                      style={{ flex: 1, background: 'linear-gradient(180deg, #06B6D4 0%, rgba(6,182,212,0.2) 100%)', borderRadius: '4px 4px 0 0' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className={styles.section}>
        <div className={styles.container}>
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className={styles.sectionHeader}
          >
            <h2>How It Works</h2>
            <p>From detection to response in milliseconds.</p>
          </motion.div>

          <div className={styles.timeline}>
            <div className={styles.timelineLine}></div>
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: '100%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className={styles.timelineProgress}
            ></motion.div>

            {[
              { icon: Thermometer, title: "Sensor Detects", desc: "IoT sensors detect smoke, fire or pressure changes." },
              { icon: Wifi, title: "Data Sent to Cloud", desc: "Encrypted data is instantly transmitted." },
              { icon: Activity, title: "System Analyzes", desc: "AI algorithms verify the threat level." },
              { icon: Bell, title: "Alert Generated", desc: "Authorities and teams are immediately notified." },
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.3 }}
                className={styles.timelineStep}
              >
                <div className={styles.timelineIcon}>
                  <step.icon size={32} />
                </div>
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className={styles.statsSection}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={styles.statValue}><AnimatedCounter from={0} to={250} suffix="+" /></div>
              <div className={styles.statLabel}>Hydrants Connected</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}><AnimatedCounter from={0} to={99} suffix=".9%" /></div>
              <div className={styles.statLabel}>Monitoring Accuracy</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>24/7</div>
              <div className={styles.statLabel}>Active Monitoring</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}><AnimatedCounter from={0} to={5000} suffix="+" /></div>
              <div className={styles.statLabel}>Alerts Processed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className={styles.section}>
        <div className={styles.container}>
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className={styles.sectionHeader}
          >
            <h2>The Smart Advantage</h2>
            <p>Why modern facilities are upgrading to intelligent monitoring.</p>
          </motion.div>

          <div className={styles.benefitsGrid}>
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className={`${styles.benefitCard} ${styles.traditional}`}
            >
              <div className={styles.benefitHeader}>
                Traditional Monitoring
              </div>
              <ul className={styles.benefitList}>
                <li><X size={20} color="#EF4444" /> Manual periodic inspections</li>
                <li><X size={20} color="#EF4444" /> Delayed disaster discovery</li>
                <li><X size={20} color="#EF4444" /> Zero predictive analytics</li>
                <li><X size={20} color="#EF4444" /> Difficult to manage at scale</li>
              </ul>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className={`${styles.benefitCard} ${styles.modern}`}
            >
              <div className={styles.benefitHeader}>
                <Flame size={24} color="#10B981" /> Smart Monitoring
              </div>
              <ul className={styles.benefitList}>
                <li><CheckCircle2 size={20} color="#10B981" /> Continuous 24/7 real-time monitoring</li>
                <li><CheckCircle2 size={20} color="#10B981" /> Instant multi-channel alerts</li>
                <li><CheckCircle2 size={20} color="#10B981" /> AI-driven predictive maintenance</li>
                <li><CheckCircle2 size={20} color="#10B981" /> Centralized cloud dashboard</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {/* <section className={`${styles.section} ${styles.testimonialsSection}`}>
        <div className={styles.container}>
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className={styles.sectionHeader}
          >
            <h2>Trusted by Industry Leaders</h2>
            <p>Hear from facilities relying on HydrantGuard to protect their assets.</p>
          </motion.div>

          <div className={styles.testimonialCarousel}>
            {[
              { name: "Sarah Jenkins", role: "Campus Operator", quote: "Deploying HydrantGuard across our 400-acre campus gave us unprecedented visibility. We identified three faulty pressure valves before they became emergencies." },
              { name: "Michael Chen", role: "Building Manager", quote: "The smart alert system integrated seamlessly with our existing building management software. It's the most reliable IoT upgrade we've made this year." },
              { name: "David Rodriguez", role: "Safety Officer", quote: "Response times have dropped dramatically since we implemented the real-time notification system. The data analytics dashboard is fantastic for our compliance reporting." },
              { name: "Emily Watson", role: "Industrial Coordinator", quote: "In an industrial setting, fire safety is paramount. The 24/7 active monitoring gives our entire operations team peace of mind." }
            ].map((t, i) => (
              <div key={i} className={styles.testimonialCard}>
                <div className={styles.stars}>
                  <Star size={16} fill="#F59E0B" />
                  <Star size={16} fill="#F59E0B" />
                  <Star size={16} fill="#F59E0B" />
                  <Star size={16} fill="#F59E0B" />
                  <Star size={16} fill="#F59E0B" />
                </div>
                <p className={styles.quote}>"{t.quote}"</p>
                <div className={styles.author}>
                  <div className={styles.avatar}></div>
                  <div className={styles.authorInfo}>
                    <h4>{t.name}</h4>
                    <p>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={styles.ctaWrapper}
          >
            <h2>Protect Your Infrastructure Before Disaster Strikes</h2>
            <p>Start monitoring hydrants intelligently with real-time insights and automated alerts.</p>
            <div className={styles.ctaActions}>
              <Link href="/auth/register" className={`${styles.btn} ${styles.btnPrimary}`}>
                Get Started
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <Link href="/" className={styles.logo}>
                <Image src="/logo.png" alt="HydrantGuard Logo" width={32} height={32} className={styles.logoImg} />
                <span>HydrantGuard</span>
              </Link>
              <p>Sistem cerdas untuk respons tanggap darurat dan proteksi aset Anda dari bahaya kebakaran secara real-time.</p>
              <div className={styles.socialIcons}>
                <a href="#" className={styles.socialIcon}>𝕏</a>
                <a href="#" className={styles.socialIcon}>in</a>
                <a href="#" className={styles.socialIcon}>GH</a>
              </div>
            </div>
            <div className={styles.footerCol}>
              <h4>Product</h4>
              <ul>
                <li><Link href="#features">Features</Link></li>
                <li><Link href="#monitoring">Live Dashboard</Link></li>
                <li><Link href="#benefits">Integrations</Link></li>
                
              </ul>
            </div>
            <div className={styles.footerCol} id="contact">
              <h4>Contact</h4>
              <ul>
                <li><a href="mailto:sales@hydrantguard.id">sales@hydrantguard.id</a></li>
                <li><a href="mailto:support@hydrantguard.id">support@hydrantguard.id</a></li>
                <li>+62 811 2345 6789</li>
                <li>Jakarta Selatan, Indonesia</li>
              </ul>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>&copy; {new Date().getFullYear()} Hydrant Guard. All rights reserved.</p>
            <div style={{display: 'flex', gap: '24px'}}>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
