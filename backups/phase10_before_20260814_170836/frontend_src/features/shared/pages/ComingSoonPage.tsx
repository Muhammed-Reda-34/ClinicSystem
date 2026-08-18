import {
  useLocation,
} from "react-router-dom";
import {
  useLanguage,
} from "../../../i18n/LanguageContext";
import type {
  TranslationKey,
} from "../../../i18n/translations";
import styles from "./ComingSoonPage.module.css";

const labels:
  Record<string, TranslationKey> =
{
  "/appointments": "appointments",
  "/follow-ups": "followUps",
  "/debts": "debts",
  "/visits": "visits",
  "/services": "services",
  "/lab": "lab",
  "/inventory": "inventory",
  "/reports": "reports",
  "/audit": "audit",
  "/settings": "settings",
};

export function ComingSoonPage() {
  const location =
    useLocation();

  const { t } =
    useLanguage();

  const key =
    labels[location.pathname]
    ?? "dashboard";

  return (
    <section className={styles.card}>
      <div className={styles.number}>
        BD
      </div>

      <h1>{t(key)}</h1>

      <p>
        {t("comingSoon")}
      </p>
    </section>
  );
}
