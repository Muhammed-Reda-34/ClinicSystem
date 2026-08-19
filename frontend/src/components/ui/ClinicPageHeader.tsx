import type { CSSProperties, ReactNode } from "react";
import { AppIcon, type AppIconName } from "../icons/AppIcon";
import styles from "./ClinicPageHeader.module.css";

export type ClinicHeaderMetricTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

export type ClinicHeaderMetric = {
  label: ReactNode;
  value: ReactNode;
  icon: AppIconName;
  tone?: ClinicHeaderMetricTone;
  hint?: ReactNode;
};

type Props = {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  icon: AppIconName;
  actions?: ReactNode;
  metrics?: ClinicHeaderMetric[];
  badge?: ReactNode;
  className?: string;
};

export function ClinicPageHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  actions,
  metrics = [],
  badge,
  className,
}: Props) {
  return (
    <header
      className={[styles.hero, className ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.glowOne} aria-hidden="true" />
      <div className={styles.glowTwo} aria-hidden="true" />

      <div className={styles.topRow}>
        <div className={styles.identity}>
          <span className={styles.mainIcon}>
            <AppIcon name={icon} size={24} />
          </span>

          <div className={styles.titleBlock}>
            <div className={styles.eyebrowRow}>
              {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
              {badge ? <span className={styles.badge}>{badge}</span> : null}
            </div>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>

        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>

      {metrics.length > 0 ? (
        <div className={styles.metrics}>
          {metrics.map((metric, index) => (
            <article
              key={index}
              className={`${styles.metric} ${styles[`metric_${metric.tone ?? "neutral"}`]}`}
              style={{ "--metric-order": index } as CSSProperties}
            >
              <span className={styles.metricIcon}>
                <AppIcon name={metric.icon} size={18} />
              </span>
              <div className={styles.metricCopy}>
                <small>{metric.label}</small>
                <strong>{metric.value}</strong>
                {metric.hint ? <span>{metric.hint}</span> : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </header>
  );
}
