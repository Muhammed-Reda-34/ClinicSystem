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
  getPatientVisits,
} from "../../visits/api/visitsApi";
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

  const {
    t,
    language,
  } =
    useLanguage();

  const {
    hasRole,
  } =
    useAuth();

  const canEdit =
    hasRole("Owner")
    || hasRole("Doctor")
    || hasRole("Secretary");

  const canCreateVisit =
    hasRole("Owner")
    || hasRole("Doctor")
    || hasRole("Secretary");

  const patientQuery =
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

  const visitsQuery =
    useQuery({
      queryKey: [
        "patient-visits",
        patientId,
      ],
      queryFn: () =>
        getPatientVisits(
          patientId!,
        ),
      enabled:
        Boolean(patientId),
    });

  if (patientQuery.isLoading) {
    return (
      <div className={styles.state}>
        {t("loading")}
      </div>
    );
  }

  if (
    patientQuery.isError
    || !patientQuery.data
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
    patientQuery.data;

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
              <span className={styles.code}>
                {patient.patientCode}
              </span>

              {patient.isBlacklisted && (
                <span className={styles.blacklist}>
                  <AppIcon
                    name="warning"
                    size={13}
                  />
                  {t("blacklist")}
                </span>
              )}
            </div>

            <h1>
              {patient.fullName}
            </h1>

            <div className={styles.meta}>
              <span>
                {patient.age ?? "—"}
                {" "}
                {patient.age !== null
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
              className={styles.actionButton}
              to={`/patients/${patient.id}/edit`}
            >
              <AppIcon
                name="edit"
                size={15}
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
              {t("blacklistWarning")}
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

      <div className={styles.quickActions}>
        <Link
          to={`/patients/${patient.id}/medical-intake`}
        >
          <span className={styles.actionIcon}>
            +
          </span>
          <div>
            <strong>
              {t("medicalIntake")}
            </strong>
            <small>
              {language === "ar"
                ? "البيانات الصحية والتاريخ المرضي"
                : "Health and medical history"}
            </small>
          </div>
        </Link>

        <Link to="/appointments">
          <span className={styles.actionIcon}>
            +
          </span>
          <div>
            <strong>
              {t("addAppointment")}
            </strong>
            <small>
              {patient.phoneNumber}
            </small>
          </div>
        </Link>

        {canCreateVisit && (
          <Link
            to={`/patients/${patient.id}/visits/new`}
          >
            <span className={styles.actionIcon}>
              +
            </span>
            <div>
              <strong>
                {t("newVisit")}
              </strong>
              <small>
                {t("dentalChart")}
              </small>
            </div>
          </Link>
        )}
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>
              {t("basicInformation")}
            </h2>
          </div>

          <dl className={styles.details}>
            <div>
              <dt>{t("phone")}</dt>
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
                {t("formNumber")}
              </dt>
              <dd>
                {patient.formNumber
                  ?? "—"}
              </dd>
            </div>

            <div>
              <dt>
                {t("dateOfBirth")}
              </dt>
              <dd>
                {patient.dateOfBirth
                  ?? "—"}
              </dd>
            </div>

            <div>
              <dt>{t("age")}</dt>
              <dd>
                {patient.age ?? "—"}
              </dd>
            </div>

            <div>
              <dt>{t("gender")}</dt>
              <dd>
                {patient.gender
                  ?? "—"}
              </dd>
            </div>

            <div>
              <dt>{t("address")}</dt>
              <dd>
                {patient.address
                  ?? "—"}
              </dd>
            </div>

            <div className={styles.fullDetail}>
              <dt>
                {t("doctors")}
              </dt>
              <dd className={styles.doctors}>
                {patient.doctors.map(
                  doctor => (
                    <span
                      key={doctor.doctorId}
                    >
                      {doctor.fullName}
                    </span>
                  ),
                )}
              </dd>
            </div>

            <div className={styles.fullDetail}>
              <dt>{t("notes")}</dt>
              <dd>
                {patient.administrativeNotes
                  || "—"}
              </dd>
            </div>
          </dl>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>
              {t("medicalInformation")}
            </h2>

            <Link
              className={styles.smallLink}
              to={`/patients/${patient.id}/medical-intake`}
            >
              {t("medicalIntake")}
            </Link>
          </div>

          <div className={styles.medicalSummary}>
            <AppIcon
              name="patients"
              size={34}
            />

            <p>
              {patient.profileStatus === 3
                || patient.profileStatus === "MedicalCompleted"
                ? (
                  language === "ar"
                    ? "تم استكمال الملف الطبي. افتح الاستمارة للمراجعة أو التعديل."
                    : "Medical intake is completed. Open it to review or edit."
                )
                : (
                  language === "ar"
                    ? "لم يتم استكمال بيانات التاريخ المرضي حتى الآن."
                    : "Medical history has not been completed yet."
                )}
            </p>
          </div>
        </article>

        <article className={[
          styles.card,
          styles.visitsCard,
        ].join(" ")}>
          <div className={styles.cardHeader}>
            <h2>
              {t("visitsHistory")}
            </h2>

            {canCreateVisit && (
              <Link
                className={styles.smallLink}
                to={`/patients/${patient.id}/visits/new`}
              >
                {t("newVisit")}
              </Link>
            )}
          </div>

          {visitsQuery.isLoading ? (
            <div className={styles.emptyModule}>
              {t("loading")}
            </div>
          ) : visitsQuery.data
              && visitsQuery.data.length > 0 ? (
            <div className={styles.visitList}>
              {visitsQuery.data.map(
                visit => (
                  <article
                    key={visit.id}
                    className={styles.visitRow}
                  >
                    <div className={styles.visitDate}>
                      {new Date(
                        visit.visitDateUtc,
                      ).toLocaleDateString(
                        language === "ar"
                          ? "ar-EG"
                          : "en-GB",
                      )}
                    </div>

                    <div className={styles.visitBody}>
                      <strong>
                        {visit.treatments
                          .map(
                            x => language === "ar"
                              ? x.serviceNameAr
                              : (
                                x.serviceNameEn
                                || x.serviceNameAr
                              ),
                          )
                          .join(" • ")}
                      </strong>

                      <small>
                        {visit.doctorName}
                      </small>

                      <div className={styles.teethLine}>
                        {visit.treatments
                          .flatMap(
                            x => x.toothNumbers,
                          )
                          .filter(
                            (
                              value,
                              index,
                              array,
                            ) =>
                              array.indexOf(value)
                              === index,
                          )
                          .sort(
                            (a, b) => a - b,
                          )
                          .join(" • ")
                          || (
                            language === "ar"
                              ? "بدون أسنان محددة"
                              : "No specific teeth"
                          )}
                      </div>
                    </div>

                    <div className={styles.visitMoney}>
                      <span>
                        {t("total")}
                      </span>
                      <strong>
                        {visit.total
                          .toLocaleString()}
                      </strong>
                      <small>
                        {t("remaining")}
                        {": "}
                        {visit.remaining
                          .toLocaleString()}
                      </small>
                    </div>
                  </article>
                ),
              )}
            </div>
          ) : (
            <div className={styles.emptyModule}>
              {t("noData")}
            </div>
          )}
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
            dateStyle: "medium",
            timeStyle: "short",
          },
        ).format(
          new Date(
            patient.createdAtUtc,
          ),
        )}
      </footer>
    </section>
  );
}
