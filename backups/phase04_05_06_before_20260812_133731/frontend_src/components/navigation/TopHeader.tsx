import {
  AppIcon,
} from "../icons/AppIcon";
import {
  useDoctorContext,
} from "../../features/context/DoctorContext";
import {
  useLanguage,
} from "../../i18n/LanguageContext";
import styles from "./TopHeader.module.css";

export function TopHeader() {
  const {
    doctors,
    selectedDoctor,
    selectDoctor,
    loading,
  } =
    useDoctorContext();

  const {
    t,
    toggleLanguage,
    language,
  } =
    useLanguage();

  const displayedDoctor =
    selectedDoctor
    ?? (
      doctors.length === 1
        ? doctors[0]
        : null
    );

  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <div className={styles.invocation}>
          {language === "ar"
            ? "لا حول ولا قوة إلا بالله"
            : t("invocation")}
        </div>

        <div className={styles.doctorName}>
          {displayedDoctor
            ? (
              language === "ar"
                ? `د/ ${displayedDoctor.fullName}`
                : `Dr. ${displayedDoctor.fullName}`
            )
            : (
              language === "ar"
                ? "إدارة العيادة"
                : "Clinic Administration"
            )}
        </div>
      </div>

      <div className={styles.controls}>
        {doctors.length > 1 && (
          <label className={styles.doctorSelector}>
            <span>
              {t("doctorContext")}
            </span>

            <select
              value={
                selectedDoctor
                  ?.doctorId
                ?? ""
              }
              disabled={loading}
              onChange={event =>
                selectDoctor(
                  event.target.value
                    || null,
                )
              }
            >
              <option value="">
                {t("allDoctors")}
              </option>

              {doctors.map(
                doctor => (
                  <option
                    key={
                      doctor.doctorId
                    }
                    value={
                      doctor.doctorId
                    }
                  >
                    {doctor.fullName}
                  </option>
                ),
              )}
            </select>
          </label>
        )}

        <button
          className={styles.languageButton}
          type="button"
          onClick={toggleLanguage}
        >
          <AppIcon
            name="language"
            size={18}
          />
          <span>
            {t("language")}
          </span>
        </button>
      </div>
    </header>
  );
}
