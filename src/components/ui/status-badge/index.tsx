import styles from '@/styles/Home.module.css';
import { AlertLevel } from '@/types/system';

interface StatusBadgeProps {
  level?: AlertLevel;
  label?: string;
}

export default function StatusBadge({ level = 'NORMAL', label }: StatusBadgeProps) {
  const className =
    level === 'KEBAKARAN'
      ? `${styles.status} ${styles.bahaya}`
      : level === 'POTENSI_KEBAKARAN'
        ? `${styles.status} ${styles.potensi}`
        : `${styles.status} ${styles.normal}`;

  return <span className={className}>{label || level}</span>;
}
