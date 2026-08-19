import { useLanguage } from "../../i18n/LanguageContext";
import { useTheme } from "./ThemeContext";
import styles from "./ThemeToggle.module.css";

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 2.5v2.1M12 19.4v2.1M4.25 4.25l1.48 1.48M18.27 18.27l1.48 1.48M2.5 12h2.1M19.4 12h2.1M4.25 19.75l1.48-1.48M18.27 5.73l1.48-1.48" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.3 15.15A8.5 8.5 0 0 1 8.85 3.7 8.5 8.5 0 1 0 20.3 15.15Z" />
    </svg>
  );
}

export function ThemeToggle() {
  const { language } = useLanguage();
  const { theme, setTheme } = useTheme();

  const lightLabel = language === "ar" ? "فاتح" : "Light";
  const darkLabel = language === "ar" ? "ليلي" : "Dark";

  return (
    <div
      className={styles.switcher}
      role="group"
      aria-label={language === "ar" ? "اختيار مظهر النظام" : "Choose system theme"}
    >
      <button
        type="button"
        className={`${styles.option} ${theme === "light" ? styles.active : ""}`}
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}
        title={lightLabel}
      >
        <span className={styles.icon}><SunIcon /></span>
        <span className={styles.label}>{lightLabel}</span>
      </button>

      <button
        type="button"
        className={`${styles.option} ${theme === "dark" ? styles.active : ""}`}
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
        title={darkLabel}
      >
        <span className={styles.icon}><MoonIcon /></span>
        <span className={styles.label}>{darkLabel}</span>
      </button>
    </div>
  );
}
