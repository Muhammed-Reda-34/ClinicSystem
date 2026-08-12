import {
  Link,
  useParams,
} from "react-router-dom";
import {
  useQuery,
} from "@tanstack/react-query";
import {
  AppIcon,
} from "../../../components/icons/AppIcon";
import {
  useLanguage,
} from "../../../i18n/LanguageContext";
import {
  useAuth,
} from "../../auth/AuthContext";
import {
  getPatient,
} from "../api/patientsApi";
import {
  statusTranslationKey,
} from "../utils/patientStatus";
import {
  toWhatsAppHref,
} from "../utils/whatsapp";
import styles from "./PatientProfilePage.module.css";

export function PatientProfilePage() {
  const { patientId } =
    useParams();

  const { t, language } =
    useLanguage();

  const { hasRole } =
    useAuth();

  const canEdit =
    hasRole("Owner")
    || hasRole("Doctor")
    || hasRole("Secretary");

  const query =
    useQuery({
      queryKey: [
        "patient",
        patientId,
      ],
      queryFn: () =>
        getPatient(
          patientId!,
        ),
      enabled:
        Boolean(patientId),
    });

  if (query.isLoading) {
    return (
      <div className={styles.state}>
        {t("loading")}
      </div>
    );
  }

  if (
    query.isError
    || !query.data
  ) {
    return (
      <div className={styles.state}>
        {language === "ar"
          ? "تعذر تحميل ملف المريض."
          : "Unable to load the patient profile."}
      </div>
    );
  }

  const patient =
    query.data;

  return (
    <section className={styles.page}>
      <header className={styles.profileHeader}>
        <div className={styles.identity}>
          <div className={styles.avatar}>
            {patient.fullName
              .trim()
              .charAt(0)}
          </div>

          <div>
            <div className={styles.topLine}>
              <span
                className={styles.code}
              >
                {patient.patientCode}
              </span>

              {patient.isBlacklisted && (
                <span
                  className={
                    styles.blacklist
                  }
                >
                  <AppIcon
                    name="warning"
                    size={13}
                  />
                  {t(
                    "blacklisted",
                  )}
                </span>
              )}
            </div>

            <h1>
              {patient.fullName}
            </h1>

            <div className={styles.meta}>
              <span>
                {patient.age
                  ?? "—"}
                {" "}
                {patient.age
                  !== null
                  ? t("years")
                  : ""}
              </span>

              <span>•</span>

              <span>
                {t(
                  statusTranslationKey(
                    patient.profileStatus,
                  ),
                )}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <a
            className={styles.whatsapp}
            href={toWhatsAppHref(
              patient.phoneNumber,
            )}
            target="_blank"
            rel="noreferrer"
          >
            {t("whatsapp")}
            <AppIcon
              name="external"
              size={15}
            />
          </a>

          {canEdit && (
            <Link
              className={styles.edit}
              to={`/patients/${patient.id}/edit`}
            >
              <AppIcon
                name="edit"
                size={16}
              />
              {t("edit")}
            </Link>
          )}
        </div>
      </header>

      {patient.isBlacklisted && (
        <div className={styles.blacklistBanner}>
          <AppIcon
            name="warning"
            size={20}
          />

          <div>
            <strong>
              {t(
                "blacklistWarning",
              )}
            </strong>

            <p>
              {language === "ar"
                ? "عدد مرات عدم الحضور:"
                : "No-show count:"}
              {" "}
              {patient.noShowCount}
            </p>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>
              {t(
                "basicInformation",
              )}
            </h2>
          </div>

          <dl className={styles.details}>
            <div>
              <dt>
                {t("phone")}
              </dt>
              <dd>
                <a
                  href={toWhatsAppHref(
                    patient.phoneNumber,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  {patient.phoneNumber}
                </a>
              </dd>
            </div>

            <div>
              <dt>
                {t(
                  "formNumber",
                )}
              </dt>
              <dd>
                {patient.formNumber
                  ?? "—"}
              </dd>
            </div>

            <div>
              <dt>
                {t(
                  "dateOfBirth",
                )}
              </dt>
              <dd>
                {patient.dateOfBirth
                  ?? "—"}
              </dd>
            </div>

            <div>
              <dt>
                {t("age")}
              </dt>
              <dd>
                {patient.age
                  ?? "—"}
              </dd>
            </div>

            <div>
              <dt>
                {t("gender")}
              </dt>
              <dd>
                {patient.gender
                  ?? "—"}
              </dd>
            </div>

            <div>
              <dt>
                {t("address")}
              </dt>
              <dd>
                {patient.address
                  ?? "—"}
              </dd>
            </div>

            <div
              className={
                styles.fullDetail
              }
            >
              <dt>
                {t("doctors")}
              </dt>
              <dd
                className={
                  styles.doctors
                }
              >
                {patient.doctors
                  .map(
                    doctor => (
                      <span
                        key={
                          doctor.doctorId
                        }
                      >
                        {
                          doctor.fullName
                        }
                      </span>
                    ),
                  )}
              </dd>
            </div>

            <div
              className={
                styles.fullDetail
              }
            >
              <dt>
                {t("notes")}
              </dt>
              <dd>
                {patient
                  .administrativeNotes
                  || "—"}
              </dd>
            </div>
          </dl>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>
              {t(
                "medicalInformation",
              )}
            </h2>

            <span className={styles.pendingTag}>
              {t("comingSoon")}
            </span>
          </div>

          <div className={styles.emptyModule}>
            <div className={styles.tooth}>
              <AppIcon
                name="tooth"
                size={42}
              />
            </div>

            <p>
              {t(
                "medicalFormPending",
              )}
            </p>
          </div>
        </article>

        <article
          className={[
            styles.card,
            styles.visitsCard,
          ].join(" ")}
        >
          <div className={styles.cardHeader}>
            <h2>
              {t(
                "visitsHistory",
              )}
            </h2>

            <span className={styles.pendingTag}>
              Phase 03C
            </span>
          </div>

          <div className={styles.emptyModule}>
            <p>
              {t(
                "visitsPending",
              )}
            </p>
          </div>
        </article>
      </div>

      <footer className={styles.profileFooter}>
        {t("createdAt")}
        {": "}
        {new Intl.DateTimeFormat(
          language === "ar"
            ? "ar-EG"
            : "en-GB",
          {
            dateStyle:
              "medium",
            timeStyle:
              "short",
          },
        ).format(
          new Date(
            patient
              .createdAtUtc,
          ),
        )}
      </footer>
    </section>
  );
}
