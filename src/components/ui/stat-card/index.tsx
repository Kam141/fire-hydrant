import styles from '@/styles/Home.module.css';
import { ReactNode } from 'react';

interface StatCardProps {
  title?: string;
  value?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}

export default function StatCard({ title = '-', value = '-', subtitle, right }: StatCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <h3>{title}</h3>
        {right}
      </div>
      <div className={styles.bigNumber}>{value}</div>
      {subtitle ? <div className={styles.meta}>{subtitle}</div> : null}
    </article>
  );
}
