import {
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  useMutation,
  useQuery,
  useQueryClient,
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
  useDoctorContext,
} from "../../context/DoctorContext";
import type {
  AppointmentAttendanceStatus,
} from "../../../types/clinical";
import {
  getMedicalIntake,
} from "../../medical/api/medicalApi";
import {
  getPatientAppointments,
  setAppointmentAttendance,
} from "../../appointments/api/appointmentsApi";
import {
  addVisitPayment,
  getPatientVisits,
} from "../../visits/api/visitsApi";
import {
  archivePatient,
  deleteVisitPayment,
} from "../../operations/api/operationsApi";
import {
  requestPatientDeletion,
} from "../../approvals/api/approvalsApi";
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

function attendanceLabel(
  status: number,
  ar: boolean,
) {
  switch (status) {
    case 1:
      return ar
        ? "حضر"
        : "Attended";
    case 2:
      return ar
        ? "لم يحضر"
        : "No show";
    case 3:
      return ar
        ? "اعتذر"
        : "Excused";
    case 4:
      return ar
        ? "ملغي"
        : "Cancelled";
    default:
      return ar
        ? "محجوز"
        : "Scheduled";
  }
}

function attendanceClass(
  status: number,
) {
  switch (status) {
    case 1:
      return styles.attended;
    case 2:
      return styles.noShow;
    case 3:
      return styles.excused;
    case 4:
      return styles.cancelled;
    default:
      return styles.scheduled;
  }
}

export function PatientProfilePage() {
  const {
    patientId,
  } =
    useParams();

  const navigate =
    useNavigate();

  const {
    t,
    language,
  } =
    useLanguage();

  const ar =
    language === "ar";

  const {
    hasRole,
  } =
    useAuth();

  const {
    selectedDoctor,
  } =
    useDoctorContext();

  const client =
    useQueryClient();

  const isOwner =
    hasRole("Owner");

  const isDoctor =
    hasRole("Doctor");

  const isSecretary =
    hasRole("Secretary");

  const isNurse =
    hasRole("Nurse");

  const canEdit =
    isOwner
    || isDoctor
    || isSecretary
    || isNurse;

  const canCreateVisit =
    isOwner
    || isDoctor
    || isSecretary
    || isNurse;

  const canOpenRecords =
    isOwner
    || isDoctor
    || isSecretary
    || isNurse;

  const canManageAttendance =
    isOwner
    || isDoctor
    || isSecretary
    || isNurse;

  const canCollectPayment =
    isOwner
    || isDoctor
    || isSecretary
    || isNurse;

  const [
    archiveConfirm,
    setArchiveConfirm,
  ] =
    useState(false);

  const [
    deletionRequestMessage,
    setDeletionRequestMessage,
  ] =
    useState("");

  const [
    paymentAmounts,
    setPaymentAmounts,
  ] =
    useState<Record<string, string>>({});

  const [
    paymentMethods,
    setPaymentMethods,
  ] =
    useState<Record<string, string>>({});

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

  const medicalQuery =
    useQuery({
      queryKey: [
        "patient-medical-intake",
        patientId,
      ],
      queryFn: () =>
        getMedicalIntake(
          patientId!,
        ),
      enabled:
        Boolean(patientId),
      retry: 0,
    });

  const appointmentsQuery =
    useQuery({
      queryKey: [
        "patient-appointments",
        patientId,
      ],
      queryFn: () =>
        getPatientAppointments(
          patientId!,
        ),
      enabled:
        Boolean(patientId),
    });

  const archiveMutation =
    useMutation({
      mutationFn:
        () =>
          archivePatient(
            patientId!,
          ),
      onSuccess:
        async () => {
          await Promise.all([
            client
              .invalidateQueries({
                queryKey:
                  ["patients"],
              }),
            client
              .invalidateQueries({
                queryKey:
                  ["dashboard"],
              }),
          ]);

          navigate(
            "/patients",
          );
        },
    });

  const requestDeletionMutation =
    useMutation({
      mutationFn:
        ({
          doctorId,
        }: {
          doctorId: string;
        }) =>
          requestPatientDeletion(
            patientId!,
            doctorId,
          ),
      onSuccess:
        async result => {
          setDeletionRequestMessage(
            ar
              ? `تم إرسال طلب الحذف للطبيب. الطلب صالح لمدة ${result.expiresInHours} ساعة.`
              : `Deletion request sent to the doctor. It expires in ${result.expiresInHours} hours.`,
          );

          await client
            .invalidateQueries({
              queryKey:
                ["approval-count"],
            });
        },
      onError:
        () => {
          setDeletionRequestMessage(
            ar
              ? "تعذر إرسال طلب الحذف. تأكد من اختيار الطبيب الحالي."
              : "Unable to send deletion request. Select the current doctor first.",
          );
        },
    });

  const attendanceMutation =
    useMutation({
      mutationFn:
        ({
          appointmentId,
          status,
        }: {
          appointmentId: string;
          status:
            AppointmentAttendanceStatus;
        }) =>
          setAppointmentAttendance(
            appointmentId,
            status,
          ),
      onSuccess:
        async () => {
          await Promise.all([
            client
              .invalidateQueries({
                queryKey:
                  [
                    "patient-appointments",
                    patientId,
                  ],
              }),
            client
              .invalidateQueries({
                queryKey:
                  ["appointments"],
              }),
            client
              .invalidateQueries({
                queryKey:
                  ["patients"],
              }),
            client
              .invalidateQueries({
                queryKey:
                  ["dashboard"],
              }),
          ]);
        },
    });

  const collectPaymentMutation =
    useMutation({
      mutationFn:
        ({
          visitId,
          amount,
          method,
        }: {
          visitId: string;
          amount: number;
          method: string;
        }) =>
          addVisitPayment(
            visitId,
            amount,
            method,
          ),
      onSuccess:
        async (
          _data,
          variables,
        ) => {
          setPaymentAmounts(
            current => ({
              ...current,
              [variables.visitId]:
                "",
            }),
          );

          setPaymentMethods(
            current => ({
              ...current,
              [variables.visitId]:
                "",
            }),
          );

          await Promise.all([
            client
              .invalidateQueries({
                queryKey:
                  [
                    "patient-visits",
                    patientId,
                  ],
              }),
            client
              .invalidateQueries({
                queryKey:
                  ["visit-debts"],
              }),
            client
              .invalidateQueries({
                queryKey:
                  ["dashboard"],
              }),
          ]);
        },
    });

  const deletePaymentMutation =
    useMutation({
      mutationFn:
        ({
          visitId,
          paymentId,
        }: {
          visitId: string;
          paymentId: string;
        }) =>
          deleteVisitPayment(
            visitId,
            paymentId,
          ),
      onSuccess:
        async () => {
          await Promise.all([
            client
              .invalidateQueries({
                queryKey:
                  [
                    "patient-visits",
                    patientId,
                  ],
              }),
            client
              .invalidateQueries({
                queryKey:
                  ["debts"],
              }),
            client
              .invalidateQueries({
                queryKey:
                  ["dashboard"],
              }),
            client
              .invalidateQueries({
                queryKey:
                  ["finance"],
              }),
          ]);
        },
    });

  if (
    patientQuery.isLoading
  ) {
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
        {ar
          ? "تعذر تحميل ملف المريض."
          : "Unable to load the patient profile."}
      </div>
    );
  }

  const patient =
    patientQuery.data;

  const medical =
    medicalQuery.data;

  const medicalCompleted =
    Boolean(
      medical?.updatedAtUtc,
    )
    || patient.profileStatus
      === 3
    || patient.profileStatus
      === "MedicalCompleted";

  const diseaseItems =
    medical
      ? [
          {
            active:
              medical.hasDrugAllergy,
            label:
              ar
                ? "حساسية أدوية"
                : "Drug allergy",
            details:
              medical.drugAllergyDetails,
          },
          {
            active:
              medical.hasHypertension,
            label:
              ar
                ? "ضغط الدم"
                : "Hypertension",
          },
          {
            active:
              medical.hasRheumaticFever,
            label:
              ar
                ? "حمى روماتيزمية"
                : "Rheumatic fever",
          },
          {
            active:
              medical.hasBloodDisease,
            label:
              ar
                ? "أمراض الدم"
                : "Blood disease",
          },
          {
            active:
              medical.hasLiverDisease,
            label:
              ar
                ? "أمراض الكبد"
                : "Liver disease",
          },
          {
            active:
              medical.hasHepatitis,
            label:
              ar
                ? "التهاب كبدي"
                : "Hepatitis",
          },
          {
            active:
              medical.hasDiabetes,
            label:
              ar
                ? "السكري"
                : "Diabetes",
          },
          {
            active:
              medical.hasHeartDisease,
            label:
              ar
                ? "أمراض القلب"
                : "Heart disease",
          },
          {
            active:
              medical.hasKidneyDisease,
            label:
              ar
                ? "أمراض الكلى"
                : "Kidney disease",
          },
          {
            active:
              medical.hasThyroidDisease,
            label:
              ar
                ? "الغدة الدرقية"
                : "Thyroid disease",
          },
          {
            active:
              medical.hasCancer,
            label:
              ar
                ? "سرطان"
                : "Cancer",
          },
        ]
        .filter(
          item =>
            item.active,
        )
      : [];

  const requiredDoctorId =
    selectedDoctor
      ?.doctorId
    ?? (
      patient.doctors.length
      === 1
        ? patient.doctors[0]
          .doctorId
        : null
    );

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
                {patient.age
                  ?? "—"}
                {" "}
                {patient.age
                  !== null
                  ? t("years")
                  : ""}
              </span>

              <span>
                •
              </span>

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
              {t(
                "blacklistWarning",
              )}
            </strong>

            <p>
              {ar
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
              {ar
                ? "استكمال أو تعديل البيانات الصحية"
                : "Complete or edit medical data"}
            </small>
          </div>
        </Link>

        <Link
          to={`/appointments?patientId=${patient.id}`}
        >
          <span className={styles.actionIcon}>
            +
          </span>

          <div>
            <strong>
              {ar
                ? "حجز موعد"
                : "Book appointment"}
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

        {canOpenRecords && (
          <Link
            to={`/patients/${patient.id}/records`}
          >
            <span className={styles.actionIcon}>
              +
            </span>

            <div>
              <strong>
                {ar
                  ? "الأشعات والروشتات"
                  : "Files & Prescriptions"}
              </strong>

              <small>
                {ar
                  ? "ملفات المريض وملاحظات الطبيب"
                  : "Patient files and clinical notes"}
              </small>
            </div>
          </Link>
        )}
      </div>

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
              <dd
                dir="ltr"
              >
                {patient.phoneNumber}
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

            <div className={styles.fullDetail}>
              <dt>
                {t("doctors")}
              </dt>

              <dd className={styles.doctors}>
                {patient.doctors.map(
                  doctor => (
                    <span
                      key={
                        doctor.doctorId
                      }
                    >
                      {doctor.fullName}
                    </span>
                  ),
                )}
              </dd>
            </div>

            <div className={styles.fullDetail}>
              <dt>
                {t("notes")}
              </dt>
              <dd>
                {patient.administrativeNotes
                  || "—"}
              </dd>
            </div>
          </dl>
        </article>

        <article className={[
          styles.card,
          styles.medicalCard,
        ].join(" ")}>
          <div className={styles.cardHeader}>
            <h2>
              {t(
                "medicalInformation",
              )}
            </h2>

            <Link
              className={styles.smallLink}
              to={`/patients/${patient.id}/medical-intake`}
            >
              {ar
                ? "تعديل البيانات الصحية"
                : "Edit medical data"}
            </Link>
          </div>

          {medicalQuery.isLoading ? (
            <div className={styles.emptyModule}>
              {t("loading")}
            </div>
          ) : medicalCompleted && medical ? (
            <div className={styles.medicalDetails}>
              <dl>
                <div>
                  <dt>
                    {ar
                      ? "هاتف بديل"
                      : "Alternate phone"}
                  </dt>
                  <dd>
                    {medical.alternatePhone
                      || "—"}
                  </dd>
                </div>

                <div>
                  <dt>
                    {ar
                      ? "الحالة الاجتماعية"
                      : "Marital status"}
                  </dt>
                  <dd>
                    {medical.maritalStatus
                      || "—"}
                  </dd>
                </div>

                <div>
                  <dt>
                    {ar
                      ? "الوظيفة"
                      : "Occupation"}
                  </dt>
                  <dd>
                    {medical.occupation
                      || "—"}
                  </dd>
                </div>

                <div>
                  <dt>
                    {ar
                      ? "آخر تحديث"
                      : "Last update"}
                  </dt>
                  <dd>
                    {medical.updatedAtUtc
                      ? new Date(
                          medical.updatedAtUtc,
                        ).toLocaleDateString(
                          ar
                            ? "ar-EG"
                            : "en-GB",
                        )
                      : "—"}
                  </dd>
                </div>
              </dl>

              <div className={styles.conditions}>
                <strong>
                  {ar
                    ? "الحالات الصحية المسجلة"
                    : "Recorded conditions"}
                </strong>

                <div>
                  {diseaseItems.length
                    > 0
                    ? diseaseItems.map(
                        item => (
                          <span
                            key={
                              item.label
                            }
                            className={styles.conditionTag}
                          >
                            {item.label}
                            {item.details
                              ? `: ${item.details}`
                              : ""}
                          </span>
                        ),
                      )
                    : (
                      <span className={styles.noCondition}>
                        {ar
                          ? "لا توجد حالات محددة من القائمة."
                          : "No listed conditions recorded."}
                      </span>
                    )}

                  {medical.otherConditions && (
                    <span className={styles.conditionTag}>
                      {medical.otherConditions}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.medicalNotes}>
                <div>
                  <strong>
                    {ar
                      ? "دخول مستشفى مؤخرًا"
                      : "Recent hospitalization"}
                  </strong>
                  <p>
                    {medical.hadRecentHospitalization
                      ? (
                        medical.recentHospitalizationReason
                        || (
                          ar
                            ? "نعم"
                            : "Yes"
                        )
                      )
                      : (
                        ar
                          ? "لا"
                          : "No"
                      )}
                  </p>
                </div>

                <div>
                  <strong>
                    {ar
                      ? "ملاحظات طبية"
                      : "Medical notes"}
                  </strong>
                  <p>
                    {medical.medicalNotes
                      || "—"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.emptyModule}>
              <p>
                {ar
                  ? "لم يتم استكمال البيانات الصحية بعد."
                  : "Medical information has not been completed yet."}
              </p>

              <Link
                className={styles.smallLink}
                to={`/patients/${patient.id}/medical-intake`}
              >
                {ar
                  ? "استكمال البيانات الصحية"
                  : "Complete medical data"}
              </Link>
            </div>
          )}
        </article>

        <article className={[
          styles.card,
          styles.appointmentsCard,
        ].join(" ")}>
          <div className={styles.cardHeader}>
            <h2>
              {ar
                ? "الحجوزات والحضور"
                : "Appointments & Attendance"}
            </h2>

            <Link
              className={styles.smallLink}
              to={`/appointments?patientId=${patient.id}`}
            >
              {ar
                ? "حجز موعد جديد"
                : "Book new appointment"}
            </Link>
          </div>

          {appointmentsQuery.isLoading ? (
            <div className={styles.emptyModule}>
              {t("loading")}
            </div>
          ) : appointmentsQuery.data
              && appointmentsQuery.data.length
              > 0 ? (
            <div className={styles.appointmentList}>
              {appointmentsQuery.data
                .slice(0, 12)
                .map(
                  appointment => (
                    <article
                      key={
                        appointment.id
                      }
                      className={styles.appointmentRow}
                    >
                      <div className={styles.appointmentMain}>
                        <strong>
                          {new Date(
                            appointment.scheduledAtUtc,
                          ).toLocaleString(
                            ar
                              ? "ar-EG"
                              : "en-GB",
                            {
                              dateStyle:
                                "medium",
                              timeStyle:
                                "short",
                            },
                          )}
                        </strong>

                        <small>
                          {appointment.doctorName}
                          {appointment.reason
                            ? ` • ${appointment.reason}`
                            : ""}
                        </small>
                      </div>

                      <span
                        className={[
                          styles.attendanceBadge,
                          attendanceClass(
                            appointment.attendanceStatus,
                          ),
                        ].join(" ")}
                      >
                        {attendanceLabel(
                          appointment.attendanceStatus,
                          ar,
                        )}
                      </span>

                      {canManageAttendance && (
                        <div className={styles.attendanceActions}>
                          <button
                            type="button"
                            className={styles.attendButton}
                            disabled={
                              attendanceMutation
                                .isPending
                            }
                            onClick={() =>
                              attendanceMutation
                                .mutate({
                                  appointmentId:
                                    appointment.id,
                                  status: 1,
                                })
                            }
                          >
                            {ar
                              ? "حضر"
                              : "Attended"}
                          </button>

                          <button
                            type="button"
                            className={styles.noShowButton}
                            disabled={
                              attendanceMutation
                                .isPending
                            }
                            onClick={() =>
                              attendanceMutation
                                .mutate({
                                  appointmentId:
                                    appointment.id,
                                  status: 2,
                                })
                            }
                          >
                            {ar
                              ? "لم يحضر"
                              : "No show"}
                          </button>

                          <button
                            type="button"
                            className={styles.excusedButton}
                            disabled={
                              attendanceMutation
                                .isPending
                            }
                            onClick={() =>
                              attendanceMutation
                                .mutate({
                                  appointmentId:
                                    appointment.id,
                                  status: 3,
                                })
                            }
                          >
                            {ar
                              ? "اعتذر"
                              : "Excused"}
                          </button>
                        </div>
                      )}
                    </article>
                  ),
                )}
            </div>
          ) : (
            <div className={styles.emptyModule}>
              {ar
                ? "لا توجد حجوزات لهذا المريض."
                : "No appointments for this patient."}
            </div>
          )}
        </article>

        <article className={[
          styles.card,
          styles.visitsCard,
        ].join(" ")}>
          <div className={styles.cardHeader}>
            <h2>
              {t(
                "visitsHistory",
              )}
            </h2>

            {canCreateVisit && (
              <Link
                className={styles.smallLink}
                to={`/patients/${patient.id}/visits/new`}
              >
                {t(
                  "newVisit",
                )}
              </Link>
            )}
          </div>

          {visitsQuery.isLoading ? (
            <div className={styles.emptyModule}>
              {t("loading")}
            </div>
          ) : visitsQuery.data
              && visitsQuery.data.length
              > 0 ? (
            <div className={styles.visitList}>
              {visitsQuery.data.map(
                visit => (
                  <article
                    key={
                      visit.id
                    }
                    className={styles.visitRow}
                  >
                    <div className={styles.visitDate}>
                      {new Date(
                        visit.visitDateUtc,
                      ).toLocaleDateString(
                        ar
                          ? "ar-EG"
                          : "en-GB",
                      )}
                    </div>

                    <div className={styles.visitBody}>
                      <strong>
                        {visit.treatments
                          .map(
                            item =>
                              ar
                                ? item.serviceNameAr
                                : (
                                  item.serviceNameEn
                                  || item.serviceNameAr
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
                            item =>
                              item.toothNumbers,
                          )
                          .filter(
                            (
                              value,
                              index,
                              array,
                            ) =>
                              array.indexOf(
                                value,
                              )
                              === index,
                          )
                          .sort(
                            (a, b) =>
                              a - b,
                          )
                          .join(" • ")
                          || (
                            ar
                              ? "بدون أسنان محددة"
                              : "No specific teeth"
                          )}
                      </div>

                      {(visit.clinicalNotes
                        || visit.treatments.some(item => item.notes)) && (
                        <div className={styles.visitClinicalNotes}>
                          {visit.treatments
                            .filter(item => item.notes)
                            .map(item => (
                              <div key={item.id}>
                                <strong>
                                  {(ar
                                    ? item.serviceNameAr
                                    : item.serviceNameEn || item.serviceNameAr)}
                                </strong>
                                <p>{item.notes}</p>
                              </div>
                            ))}

                          {visit.clinicalNotes && (
                            <div>
                              <strong>
                                {ar ? "ملاحظة الطبيب" : "Doctor note"}
                              </strong>
                              <p>{visit.clinicalNotes}</p>
                            </div>
                          )}
                        </div>
                      )}
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

                    <div className={styles.paymentHistory}>
                      <strong>
                        {ar
                          ? "الدفعات"
                          : "Payments"}
                      </strong>

                      {visit.payments.length
                        > 0 ? (
                        <div className={styles.paymentList}>
                          {visit.payments.map(
                            payment => (
                              <div
                                key={
                                  payment.id
                                }
                                className={styles.paymentRow}
                              >
                                <span>
                                  {payment.amount
                                    .toLocaleString()}
                                  {" EGP"}
                                </span>

                                <small>
                                  {new Date(
                                    payment.paidAtUtc,
                                  ).toLocaleDateString(
                                    ar
                                      ? "ar-EG"
                                      : "en-GB",
                                  )}
                                  {payment.method
                                    ? ` • ${payment.method}`
                                    : ""}
                                  {payment.notes
                                    ? ` • ${payment.notes === "Deposit" && ar ? "ديبوزيت" : payment.notes}`
                                    : ""}
                                </small>

                                {isOwner && (
                                  <button
                                    type="button"
                                    disabled={
                                      deletePaymentMutation
                                        .isPending
                                    }
                                    onClick={() =>
                                      deletePaymentMutation
                                        .mutate({
                                          visitId:
                                            visit.id,
                                          paymentId:
                                            payment.id,
                                        })
                                    }
                                  >
                                    {ar
                                      ? "حذف الدفعة"
                                      : "Delete"}
                                  </button>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <small>
                          {ar
                            ? "لا توجد دفعات."
                            : "No payments."}
                        </small>
                      )}
                    </div>

                    {canCollectPayment
                      && visit.remaining > 0
                      && (
                        <div className={styles.collectPayment}>
                          <div>
                            <strong>
                              {ar
                                ? "تحصيل دفعة"
                                : "Collect payment"}
                            </strong>
                            <small>
                              {ar
                                ? `المتبقي: ${visit.remaining.toLocaleString()} EGP`
                                : `Remaining: ${visit.remaining.toLocaleString()} EGP`}
                            </small>
                          </div>

                          <input
                            type="number"
                            min="0.01"
                            max={visit.remaining}
                            step="0.01"
                            value={
                              paymentAmounts[
                                visit.id
                              ]
                              ?? ""
                            }
                            placeholder={
                              ar
                                ? "قيمة الدفعة"
                                : "Amount"
                            }
                            onChange={event =>
                              setPaymentAmounts(
                                current => ({
                                  ...current,
                                  [visit.id]:
                                    event.target
                                    .value,
                                }),
                              )
                            }
                          />

                          <select
                            value={paymentMethods[visit.id] ?? ""}
                            onChange={event =>
                              setPaymentMethods(current => ({
                                ...current,
                                [visit.id]: event.target.value,
                              }))
                            }
                          >
                            <option value="">
                              {ar ? "طريقة الدفع" : "Payment method"}
                            </option>
                            <option value="Cash">
                              {ar ? "كاش" : "Cash"}
                            </option>
                            <option value="InstaPay">InstaPay</option>
                            <option value="Vodafone Cash">Vodafone Cash</option>
                          </select>

                          <button
                            type="button"
                            disabled={
                              collectPaymentMutation
                                .isPending
                              || !paymentMethods[visit.id]
                              || !Number(
                                paymentAmounts[
                                  visit.id
                                ],
                              )
                              || Number(
                                paymentAmounts[
                                  visit.id
                                ],
                              )
                                > visit.remaining
                            }
                            onClick={() =>
                              collectPaymentMutation
                                .mutate({
                                  visitId:
                                    visit.id,
                                  amount:
                                    Number(
                                      paymentAmounts[
                                        visit.id
                                      ],
                                    ),
                                  method:
                                    paymentMethods[visit.id],
                                })
                            }
                          >
                            {ar
                              ? "تسجيل الدفعة"
                              : "Record payment"}
                          </button>
                        </div>
                      )}
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

      {(isOwner
        || isSecretary
        || isNurse) && (
        <section className={styles.archiveSection}>
          {isOwner ? (
            !archiveConfirm ? (
              <button
                type="button"
                onClick={() =>
                  setArchiveConfirm(
                    true,
                  )
                }
              >
                {ar
                  ? "حذف / أرشفة المريض"
                  : "Delete / archive patient"}
              </button>
            ) : (
              <div className={styles.archiveConfirm}>
                <span>
                  {ar
                    ? "سيختفي المريض من التشغيل اليومي مع الاحتفاظ بتاريخه الطبي والمالي وسجل العمليات."
                    : "The patient will leave operational lists while medical, financial and audit history is preserved."}
                </span>

                <button
                  type="button"
                  disabled={
                    archiveMutation
                      .isPending
                  }
                  onClick={() =>
                    archiveMutation
                      .mutate()
                  }
                >
                  {ar
                    ? "تأكيد الحذف التشغيلي"
                    : "Confirm archive"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setArchiveConfirm(
                      false,
                    )
                  }
                >
                  {t("cancel")}
                </button>
              </div>
            )
          ) : (
            <div className={styles.staffDeletionRequest}>
              <div>
                <strong>
                  {ar
                    ? "طلب حذف المريض"
                    : "Request patient deletion"}
                </strong>

                <p>
                  {ar
                    ? "السكرتيرة أو الممرضة لا تستطيع حذف المريض مباشرة. يتم إرسال طلب للطبيب صالح لمدة 48 ساعة."
                    : "Staff cannot delete a patient directly. A 48-hour approval request is sent to the doctor."}
                </p>

                {deletionRequestMessage && (
                  <small>
                    {deletionRequestMessage}
                  </small>
                )}
              </div>

              <button
                type="button"
                disabled={
                  !requiredDoctorId
                  || requestDeletionMutation
                    .isPending
                }
                onClick={() => {
                  if (!requiredDoctorId) {
                    setDeletionRequestMessage(
                      ar
                        ? "اختر الطبيب الحالي من أعلى الصفحة أولًا."
                        : "Select the current doctor first.",
                    );
                    return;
                  }

                  requestDeletionMutation
                    .mutate({
                      doctorId:
                        requiredDoctorId,
                    });
                }}
              >
                {ar
                  ? "إرسال طلب الحذف للطبيب"
                  : "Send deletion request"}
              </button>
            </div>
          )}
        </section>
      )}

      <footer className={styles.profileFooter}>
        {t("createdAt")}
        {": "}
        {new Intl.DateTimeFormat(
          ar
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
            patient.createdAtUtc,
          ),
        )}
      </footer>
    </section>
  );
}
