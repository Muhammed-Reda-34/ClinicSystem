import { useAuth } from "../../auth/AuthContext";
import { useLanguage } from "../../../i18n/LanguageContext";
import { useDoctorContext } from "../../context/DoctorContext";
import styles from "./DashboardPage.module.css";

export function DashboardPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { selectedDoctor } =
    useDoctorContext();

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div>
          <span className={styles.kicker}>
            {t("systemReady")}
          </span>

          <h1>
            {t("welcome")}،{" "}
            {user?.fullName}
          </h1>

          <p>
            {selectedDoctor
              ? selectedDoctor.fullName
              : t("allDoctors")}
          </p>
        </div>

        <div className={styles.heroSeal}>
          BD
        </div>
      </div>

      <div className={styles.stats}>
        <article className={styles.statCard}>
          <span>
            {t("totalPatients")}
          </span>
          <strong>—</strong>
          <small>
            {language === "ar"
              ? "وحدة المرضى جاهزة"
              : "Patients module active"}
          </small>
        </article>

        <article className={styles.statCard}>
          <span>
            {t("todayAppointments")}
          </span>
          <strong>—</strong>
          <small>
            {language === "ar"
              ? "سيتم ربطها بوحدة المواعيد"
              : "Appointments phase"}
          </small>
        </article>

        <article className={styles.statCard}>
          <span>
            {t("todayFollowUps")}
          </span>
          <strong>—</strong>
          <small>
            {language === "ar"
              ? "سيتم ربطها بوحدة المتابعات"
              : "Follow-ups phase"}
          </small>
        </article>

        <article className={styles.statCard}>
          <span>
            {t("outstandingBalances")}
          </span>
          <strong>—</strong>
          <small>
            {language === "ar"
              ? "سيتم ربطها بوحدة المدفوعات"
              : "Payments phase"}
          </small>
        </article>
      </div>
    </section>
  );
}
