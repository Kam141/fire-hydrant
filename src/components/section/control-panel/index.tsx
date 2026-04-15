import styles from '@/styles/Home.module.css';
import { ReactNode } from 'react';

interface ControlPanelProps {
  id?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  footer?: ReactNode;
}

export default function ControlPanel({ id, title = '-', description = '-', actions, footer }: ControlPanelProps) {
  return (
    <section id={id} className={styles.section}>
      <h2>{title}</h2>
      <p>{description}</p>
      {actions ? <div className={styles.controls}>{actions}</div> : null}
      {footer ? <p className={styles.meta}>{footer}</p> : null}
    </section>
  );
}
