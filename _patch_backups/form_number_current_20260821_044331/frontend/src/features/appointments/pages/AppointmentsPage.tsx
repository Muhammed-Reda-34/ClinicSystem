import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import axios from "axios";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  useLanguage,
} from "../../../i18n/LanguageContext";
import {
  useDoctorContext,
} from "../../context/DoctorContext";
import type {
  AppointmentAttendanceStatus,
} from "../../../types/clinical";
import {
  checkPatientPhone,
} from "../../patients/api/patientsApi";
import {
  createPreliminaryBooking,
  getPreliminaryBookings,
  setPreliminaryBookingAttendance,
} from "../api/preliminaryBookingsApi";
import styles from "./AppointmentsPage.module.css";
import { SimpleDateInput } from "../../../components/forms/SimpleDateInput";

function localDateKey(
  value = new Date(),
) {
  const pad = (part: number) =>
    String(part).padStart(2, "0");

  return [
    value.getFullYear(),
    "-",
    pad(value.getMonth() + 1),
    "-",
    pad(value.getDate()),
  ].join("");
}

function errorMessage(
  error: unknown,
  ar: boolean,
) {
  if (axios.isAxiosError(error)) {
    const message =
      error.response?.data?.message;

    if (
      typeof message === "string"
      && message.trim()
    ) {
      return message;
    }
  }

  return ar
    ? "تعذر حفظ البيانات. راجع البيانات وحاول مرة أخرى."
    : "Could not save the booking. Check the data and try again.";
}

function statusText(
  status: AppointmentAttendanceStatus,
  ar: boolean,
) {
  switch (status) {
    case 1:
      return ar ? "حضر" : "Attended";
    case 2:
      return ar ? "لم يحضر" : "No show";
    case 3:
      return ar ? "اعتذر" : "Excused";
    default:
      return ar ? "حجز مبدئي" : "Preliminary";
  }
}

function normalizedSearch(value: string) {
  return value.trim().toLocaleLowerCase();
}

type IconName =
  | "calendar"
  | "check"
  | "close"
  | "clock"
  | "doctor"
  | "file"
  | "phone"
  | "plus"
  | "save"
  | "search"
  | "users"
  | "warning";

function UiIcon({
  name,
  size = 18,
}: {
  name: IconName;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "calendar":
      return (
        <svg {...common}>
          <path d="M7 3v3M17 3v3M4 9h16" />
          <rect x="4" y="5" width="16" height="16" rx="3" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "doctor":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M6.5 20c.6-4 2.4-6 5.5-6s4.9 2 5.5 6" />
          <path d="M17.5 12.5V16M15.75 14.25h3.5" />
        </svg>
      );
    case "file":
      return (
        <svg {...common}>
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v5h5M10 13h5M10 17h5" />
        </svg>
      );
    case "phone":
      return (
        <svg {...common}>
          <path d="M7.5 4.5 10 8l-2 2c1.2 2.7 3.3 4.8 6 6l2-2 3.5 2.5c.3.2.5.6.4 1-.3 1.7-1.8 3-3.6 3C9.2 20.5 3.5 14.8 3.5 7.7c0-1.8 1.3-3.3 3-3.6.4-.1.8.1 1 .4Z" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "save":
      return (
        <svg {...common}>
          <path d="M5 4h12l2 2v14H5z" />
          <path d="M8 4v6h8V4M8 20v-6h8v6" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 4 4" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="9" r="3" />
          <path d="M3.5 20c.5-4 2.3-6 5.5-6s5 2 5.5 6" />
          <path d="M16 7.5a2.5 2.5 0 0 1 0 5M16.5 14.5c2.4.4 3.7 2.2 4 5.5" />
        </svg>
      );
    case "warning":
      return (
        <svg {...common}>
          <path d="M12 4 3.5 19h17z" />
          <path d="M12 9v4M12 16.5h.01" />
        </svg>
      );
  }
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: IconName;
  label: string;
  value: number;
  tone: "primary" | "success" | "danger" | "warning";
}) {
  return (
    <div className={`${styles.summaryCard} ${styles[tone]}`}>
      <div className={styles.summaryIcon}>
        <UiIcon name={icon} size={19} />
      </div>
      <div className={styles.summaryInfo}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className={styles.fieldLabel}>{children}</span>;
}

export function AppointmentsPage() {
  const { language } = useLanguage();
  const ar = language === "ar";
  const client = useQueryClient();
  const {
    doctors,
    selectedDoctor,
    selectDoctor,
  } = useDoctorContext();

  const [date, setDate] =
    useState(() => localDateKey());

  const [patientName, setPatientName] =
    useState("");

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [visitDate, setVisitDate] =
    useState(() => localDateKey());

  const [visitTime, setVisitTime] =
    useState("");

  const [searchDraft, setSearchDraft] =
    useState("");

  const [appliedSearch, setAppliedSearch] =
    useState("");

  const [notice, setNotice] = useState<{
    tone: "success" | "warning" | "info";
    text: string;
    patientId?: string | null;
  } | null>(null);

  const query = useQuery({
    queryKey: [
      "preliminary-bookings",
      date,
    ],
    queryFn: () =>
      getPreliminaryBookings(date),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const phoneDigits = phoneNumber.replace(/\D/g, "");

  const phoneCheckQuery = useQuery({
    queryKey: [
      "preliminary-booking-phone-check",
      phoneNumber,
    ],
    queryFn: () => checkPatientPhone(phoneNumber),
    enabled: phoneDigits.length >= 7,
    staleTime: 10_000,
    retry: false,
  });

  const existingPhoneMatch =
    phoneCheckQuery.data?.visibleMatches?.[0] ?? null;

  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({
        queryKey: [
          "preliminary-bookings",
        ],
      }),
      client.invalidateQueries({
        queryKey: ["patients"],
      }),
      client.invalidateQueries({
        queryKey: ["patients", "blacklist"],
      }),
      client.invalidateQueries({
        queryKey: ["dashboard"],
      }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: createPreliminaryBooking,
    onSuccess: async data => {
      if (data.isBlacklisted) {
        setNotice({
          tone: "warning",
          text: ar
            ? `⚠️ تنبيه: المريض موجود في البلاك ليست بعد ${data.noShowCount} مرات عدم حضور.`
            : `⚠️ Warning: the patient is blacklisted after ${data.noShowCount} no-shows.`,
          patientId: data.patientId,
        });
      } else if (data.wasExistingPatient) {
        setNotice({
          tone: "info",
          text: ar
            ? "ℹ️ رقم الهاتف مسجل بالفعل. تم ربط الحجز بملف المريض الموجود بدل إنشاء ملف مكرر."
            : "ℹ️ This phone is already registered. The booking was linked to the existing patient instead of creating a duplicate.",
          patientId: data.patientId,
        });
      } else {
        setNotice({
          tone: "success",
          text: ar
            ? "✅ تم حفظ الحجز وإنشاء ملف مبدئي للمريض."
            : "✅ Booking saved and a preliminary patient profile was created.",
          patientId: data.patientId,
        });
      }

      setPatientName("");
      setPhoneNumber("");
      setVisitDate(date);
      setVisitTime("");
      await refresh();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      bookingId,
      status,
    }: {
      bookingId: string;
      status: AppointmentAttendanceStatus;
    }) =>
      setPreliminaryBookingAttendance(
        bookingId,
        status,
      ),
    onSuccess: async data => {
      if (data.isBlacklisted) {
        setNotice({
          tone: "warning",
          text: ar
            ? `⚠️ المريض دخل البلاك ليست تلقائيًا. عدد مرات عدم الحضور: ${data.noShowCount}.`
            : `⚠️ The patient was automatically blacklisted. No-shows: ${data.noShowCount}.`,
          patientId: data.patientId,
        });
      }

      await refresh();
    },
  });

  const items = query.data ?? [];

  const datedItems = useMemo(
    () =>
      items.filter(
        item => item.visitDate === date,
      ),
    [items, date],
  );

  const unscheduledItems = useMemo(
    () =>
      items.filter(
        item => !item.visitDate,
      ),
    [items],
  );

  const searchTerm = normalizedSearch(appliedSearch);

  const filterBySearch = (
    item: (typeof items)[number],
  ) => {
    if (!searchTerm) {
      return true;
    }

    const haystack = [
      item.patientName,
      item.phoneNumber,
      item.patientCode ?? "",
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(searchTerm);
  };

  const visibleDatedItems = useMemo(
    () => datedItems.filter(filterBySearch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [datedItems, searchTerm],
  );

  const visibleUnscheduledItems = useMemo(
    () => unscheduledItems.filter(filterBySearch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unscheduledItems, searchTerm],
  );

  const summary = useMemo(
    () => ({
      total: datedItems.length,
      attended: datedItems.filter(
        item => item.attendanceStatus === 1,
      ).length,
      noShow: datedItems.filter(
        item => item.attendanceStatus === 2,
      ).length,
      excused: datedItems.filter(
        item => item.attendanceStatus === 3,
      ).length,
    }),
    [datedItems],
  );

  function submit(
    event: FormEvent,
  ) {
    event.preventDefault();
    setNotice(null);

    if (!selectedDoctor) {
      setNotice({
        tone: "warning",
        text: ar
          ? "اختر الطبيب المسؤول عن الحجز أولًا."
          : "Select the responsible doctor first.",
      });
      return;
    }

    createMutation.mutate({
      patientName: patientName.trim(),
      phoneNumber: phoneNumber.trim(),
      doctorId: selectedDoctor.doctorId,
      visitDate: visitDate || null,
      visitTime: visitTime || null,
    });
  }

  function renderBooking(
    item: (typeof items)[number],
  ) {
    const statusClass =
      item.attendanceStatus === 1
        ? styles.attended
        : item.attendanceStatus === 2
          ? styles.noShow
          : item.attendanceStatus === 3
            ? styles.excused
            : styles.scheduled;

    const needsMedicalIntake =
      item.patientProfileStatus !== null
      && item.patientProfileStatus < 3;

    const doctorName = item.doctorId
      ? doctors.find(doctor => doctor.doctorId === item.doctorId)?.fullName ?? "—"
      : null;

    const patientInitial = item.patientName.trim().charAt(0).toUpperCase() || "P";

    return (
      <article
        key={item.id}
        className={[
          styles.bookingRow,
          statusClass,
        ].join(" ")}
      >
        <div className={styles.patientCell}>
          <div className={styles.patientAvatar}>{patientInitial}</div>

          <div className={styles.bookingIdentity}>
            <div className={styles.identityLine}>
              <strong>{item.patientName}</strong>
              {item.isBlacklisted && (
                <span className={styles.blacklistBadge}>
                  <UiIcon name="warning" size={12} />
                  {ar ? "بلاك ليست" : "Blacklist"}
                </span>
              )}
            </div>

            <a href={`tel:${item.phoneNumber}`} className={styles.phoneLink}>
              <UiIcon name="phone" size={14} />
              {item.phoneNumber}
            </a>

            <div className={styles.patientMeta}>
              <span>{item.patientCode ?? (ar ? "بدون كود" : "No code")}</span>
              {doctorName && (
                <span>{ar ? "د." : "Dr."} {doctorName}</span>
              )}
              {item.noShowCount > 0 && (
                <span className={styles.noShowMeta}>
                  {ar ? "عدم حضور" : "No-shows"}: {item.noShowCount}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.bookingDateTime}>
          <div className={styles.dateTimeIcon}>
            <UiIcon name="calendar" size={16} />
          </div>
          <div>
            <span>
              {item.visitDate
                ? new Date(
                  `${item.visitDate}T12:00:00`,
                ).toLocaleDateString(
                  ar ? "ar-EG" : "en-GB",
                )
                : ar
                  ? "بدون تاريخ"
                  : "No date"}
            </span>
            <small>
              <UiIcon name="clock" size={13} />
              {item.visitTime
                ? item.visitTime.slice(0, 5)
                : ar
                  ? "بدون وقت"
                  : "No time"}
            </small>
          </div>
        </div>

        <div className={styles.statusBlock}>
          <div className={styles.statusTopLine}>
            <span className={styles.statusPill}>
              <i />
              {statusText(
                item.attendanceStatus,
                ar,
              )}
            </span>
          </div>

          <div className={styles.attendanceButtons}>
            <button
              type="button"
              className={styles.attendedButton}
              disabled={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate({
                  bookingId: item.id,
                  status: 1,
                })
              }
            >
              <UiIcon name="check" size={14} />
              {ar ? "حضر" : "Attended"}
            </button>

            <button
              type="button"
              className={styles.noShowButton}
              disabled={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate({
                  bookingId: item.id,
                  status: 2,
                })
              }
            >
              <UiIcon name="close" size={14} />
              {ar ? "لم يحضر" : "No show"}
            </button>

            <button
              type="button"
              className={styles.excusedButton}
              disabled={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate({
                  bookingId: item.id,
                  status: 3,
                })
              }
            >
              <UiIcon name="file" size={14} />
              {ar ? "اعتذر" : "Excused"}
            </button>
          </div>

          {item.patientId && (
            <div className={styles.patientActions}>
              {needsMedicalIntake && (
                <Link
                  to={`/patients/${item.patientId}/medical-intake`}
                  className={styles.secondaryAction}
                >
                  <UiIcon name="file" size={14} />
                  {ar ? "استكمال البيانات" : "Complete data"}
                </Link>
              )}

              <Link
                to={`/patients/${item.patientId}/visits/new`}
                className={styles.primaryAction}
              >
                <UiIcon name="plus" size={14} />
                {ar ? "زيارة جديدة" : "New visit"}
              </Link>
            </div>
          )}
        </div>
      </article>
    );
  }

  return (
    <section className={styles.page} dir={ar ? "rtl" : "ltr"}>
      <header className={styles.pageHeader}>
        <div className={styles.headerMain}>
          <div className={styles.titleMark}>
            <UiIcon name="calendar" size={22} />
          </div>

          <div className={styles.headerCopy}>
            <span className={styles.eyebrow}>
              {ar ? "إدارة المواعيد" : "Appointments"}
            </span>
            <h1>{ar ? "الحجز المبدئي" : "Preliminary booking"}</h1>
            <p>
              {ar
                ? "سجل حجز المريض، حدد الطبيب والموعد، وتابع حالة الحضور من مكان واحد."
                : "Register a patient, assign the doctor and time, and manage attendance from one place."}
            </p>
          </div>
        </div>

        <div className={styles.headerControls}>
          <div className={styles.doctorContextBadge}>
            <span className={styles.contextIcon}>
              <UiIcon name="doctor" size={16} />
            </span>
            <div>
              <small>{ar ? "النطاق الحالي" : "Current scope"}</small>
              <strong>
                {selectedDoctor?.fullName ?? (ar ? "كل الأطباء" : "All doctors")}
              </strong>
            </div>
          </div>

          <label className={styles.dayPicker}>
            <span>{ar ? "عرض حجوزات يوم" : "Bookings date"}</span>
            <div className={styles.dayPickerControl}>
              <UiIcon name="calendar" size={16} />
              <SimpleDateInput
                value={date}
                onChange={next => {
                  setDate(next);
                  setVisitDate(next);
                }}
              />
            </div>
          </label>
        </div>
      </header>

      <div className={styles.summaryGrid}>
        <StatCard
          icon="users"
          label={ar ? "إجمالي اليوم" : "Day total"}
          value={summary.total}
          tone="primary"
        />
        <StatCard
          icon="check"
          label={ar ? "حضر" : "Attended"}
          value={summary.attended}
          tone="success"
        />
        <StatCard
          icon="close"
          label={ar ? "لم يحضر" : "No show"}
          value={summary.noShow}
          tone="danger"
        />
        <StatCard
          icon="file"
          label={ar ? "اعتذر" : "Excused"}
          value={summary.excused}
          tone="warning"
        />
      </div>

      {notice && (
        <div
          className={[
            styles.notice,
            notice.tone === "warning"
              ? styles.noticeWarning
              : notice.tone === "success"
                ? styles.noticeSuccess
                : styles.noticeInfo,
          ].join(" ")}
        >
          <div className={styles.noticeMessage}>
            <span className={styles.noticeIcon}>
              {notice.tone === "success" ? (
                <UiIcon name="check" size={16} />
              ) : notice.tone === "warning" ? (
                <UiIcon name="warning" size={16} />
              ) : (
                <UiIcon name="file" size={16} />
              )}
            </span>
            <strong>{notice.text}</strong>
          </div>

          {notice.patientId && (
            <div className={styles.noticeActions}>
              <Link to={`/patients/${notice.patientId}/medical-intake`}>
                <UiIcon name="file" size={14} />
                {ar ? "استكمال البيانات" : "Complete data"}
              </Link>
              <Link to={`/patients/${notice.patientId}/visits/new`}>
                <UiIcon name="plus" size={14} />
                {ar ? "إضافة زيارة" : "Add visit"}
              </Link>
            </div>
          )}
        </div>
      )}

      <div className={styles.layout}>
        <form
          className={styles.formCard}
          onSubmit={submit}
        >
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.sectionKicker}>
                {ar ? "حجز جديد" : "New booking"}
              </span>
              <h2>
                {ar
                  ? "إضافة حجز مبدئي"
                  : "Add preliminary booking"}
              </h2>
              <p>
                {ar
                  ? "أدخل بيانات المريض الأساسية ثم حدد الموعد."
                  : "Enter the patient basics, then choose an appointment time."}
              </p>
            </div>
            <span className={styles.cardHeaderIcon}>
              <UiIcon name="plus" size={19} />
            </span>
          </div>

          <div className={styles.formBody}>
            <div className={styles.fieldGroup}>
              <label>
                <FieldLabel>{ar ? "الطبيب المسؤول" : "Responsible doctor"}</FieldLabel>
                <div className={styles.selectWrap}>
                  <span className={styles.inputIcon}>
                    <UiIcon name="doctor" size={16} />
                  </span>
                  <select
                    required
                    value={selectedDoctor?.doctorId ?? ""}
                    onChange={event =>
                      selectDoctor(event.target.value || null)
                    }
                  >
                    <option value="">
                      {ar ? "اختر الطبيب" : "Select doctor"}
                    </option>
                    {doctors.map(doctor => (
                      <option key={doctor.doctorId} value={doctor.doctorId}>
                        {doctor.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              {doctors.length > 1 && (
                <>
                  <small className={styles.scopeHint}>
                    {ar
                      ? "اختر الطبيب الصحيح لكل حجز؛ نفس حساب الفريق يمكنه خدمة أكثر من طبيب."
                      : "Choose the right doctor for each booking; one staff account can serve multiple doctors."}
                  </small>
                  <div className={styles.doctorChips}>
                    {doctors.map(doctor => (
                      <button
                        key={doctor.doctorId}
                        type="button"
                        className={doctor.doctorId === selectedDoctor?.doctorId ? styles.doctorChipActive : ""}
                        onClick={() => selectDoctor(doctor.doctorId)}
                      >
                        <span>{doctor.fullName.trim().charAt(0)}</span>
                        {doctor.fullName}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className={styles.formDivider} />

            <label>
              <FieldLabel>
                {ar ? "اسم المريض" : "Patient name"}
                <i>*</i>
              </FieldLabel>
              <input
                required
                maxLength={250}
                value={patientName}
                onChange={event => setPatientName(event.target.value)}
                placeholder={ar ? "اكتب الاسم بالكامل" : "Enter full name"}
              />
            </label>

            <label>
              <FieldLabel>
                {ar ? "رقم الهاتف" : "Phone number"}
                <i>*</i>
              </FieldLabel>
              <div className={styles.inputWithIcon}>
                <span className={styles.inputIcon}>
                  <UiIcon name="phone" size={16} />
                </span>
                <input
                  required
                  inputMode="tel"
                  maxLength={30}
                  value={phoneNumber}
                  onChange={event => setPhoneNumber(event.target.value)}
                  placeholder="01xxxxxxxxx"
                />
              </div>
            </label>

            {phoneCheckQuery.isFetching && phoneDigits.length >= 7 && (
              <small className={styles.phoneChecking}>
                <span />
                {ar ? "جاري فحص رقم الهاتف..." : "Checking phone number..."}
              </small>
            )}

            {existingPhoneMatch && (
              <div
                className={[
                  styles.existingPatient,
                  existingPhoneMatch.isBlacklisted
                    ? styles.existingBlacklisted
                    : "",
                ].join(" ")}
              >
                <div className={styles.existingPatientCopy}>
                  <span className={styles.existingPatientIcon}>
                    {existingPhoneMatch.isBlacklisted ? (
                      <UiIcon name="warning" size={16} />
                    ) : (
                      <UiIcon name="users" size={16} />
                    )}
                  </span>
                  <div>
                    <strong>
                      {existingPhoneMatch.isBlacklisted
                        ? ar
                          ? "المريض مسجل وموجود في البلاك ليست"
                          : "Patient exists and is blacklisted"
                        : ar
                          ? "المريض مسجل بالفعل"
                          : "Patient already registered"}
                    </strong>
                    <span>
                      {existingPhoneMatch.fullName} · {existingPhoneMatch.patientCode}
                    </span>
                  </div>
                </div>

                <Link to={`/patients/${existingPhoneMatch.id}/visits/new`}>
                  <UiIcon name="plus" size={14} />
                  {ar ? "زيارة جديدة" : "New visit"}
                </Link>
              </div>
            )}

            {!existingPhoneMatch
              && phoneCheckQuery.data?.exists
              && phoneDigits.length >= 7 && (
                <div className={styles.existingPatient}>
                  <div className={styles.existingPatientCopy}>
                    <span className={styles.existingPatientIcon}>
                      <UiIcon name="users" size={16} />
                    </span>
                    <strong>
                      {ar
                        ? "رقم الهاتف موجود بالفعل وسيتم ربط الحجز بالملف الموجود."
                        : "This phone already exists; the booking will be linked to the existing file."}
                    </strong>
                  </div>
                </div>
              )}

            <div className={styles.twoColumns}>
              <label>
                <FieldLabel>
                  {ar
                    ? "تاريخ الزيارة"
                    : "Visit date"}
                  <em>{ar ? "اختياري" : "Optional"}</em>
                </FieldLabel>
                <SimpleDateInput
                  value={visitDate}
                  onChange={setVisitDate}
                />
              </label>

              <label>
                <FieldLabel>
                  {ar
                    ? "الوقت"
                    : "Time"}
                  <em>{ar ? "اختياري" : "Optional"}</em>
                </FieldLabel>
                <input
                  type="time"
                  value={visitTime}
                  onChange={event => setVisitTime(event.target.value)}
                />
              </label>
            </div>

            {createMutation.isError && (
              <div className={styles.error}>
                <UiIcon name="warning" size={16} />
                {errorMessage(createMutation.error, ar)}
              </div>
            )}

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={
                createMutation.isPending
                || !selectedDoctor
                || !patientName.trim()
                || !phoneNumber.trim()
              }
            >
              {createMutation.isPending ? (
                <span className={styles.buttonLoader} />
              ) : (
                <UiIcon name="save" size={17} />
              )}
              {createMutation.isPending
                ? ar
                  ? "جاري الحفظ..."
                  : "Saving..."
                : ar
                  ? "حفظ الحجز المبدئي"
                  : "Save preliminary booking"}
            </button>
          </div>
        </form>

        <section className={styles.listCard}>
          <div className={styles.listHeader}>
            <div>
              <span className={styles.sectionKicker}>
                {ar ? "قائمة المواعيد" : "Appointment list"}
              </span>
              <h2>
                {ar
                  ? "حجوزات اليوم المحدد"
                  : "Selected day bookings"}
              </h2>
              <p>
                {new Date(`${date}T12:00:00`).toLocaleDateString(
                  ar ? "ar-EG" : "en-GB",
                  { weekday: "long", day: "numeric", month: "long", year: "numeric" },
                )}
              </p>
            </div>

            <div className={styles.listCount}>
              <strong>{datedItems.length}</strong>
              <span>{ar ? "حجز" : "bookings"}</span>
            </div>
          </div>

          <form
            className={styles.searchBar}
            onSubmit={event => {
              event.preventDefault();
              setAppliedSearch(searchDraft.trim());
            }}
          >
            <div className={styles.searchInputWrap}>
              <UiIcon name="search" size={17} />
              <input
                value={searchDraft}
                onChange={event => setSearchDraft(event.target.value)}
                placeholder={
                  ar
                    ? "ابحث بالاسم أو رقم الهاتف أو كود المريض"
                    : "Search by name, phone or patient code"
                }
              />
            </div>
            <button type="submit" className={styles.searchButton}>
              {ar ? "بحث" : "Search"}
            </button>
            {appliedSearch && (
              <button
                type="button"
                className={styles.clearSearch}
                onClick={() => {
                  setSearchDraft("");
                  setAppliedSearch("");
                }}
              >
                <UiIcon name="close" size={14} />
                {ar ? "مسح" : "Clear"}
              </button>
            )}
          </form>

          <div className={styles.bookingsList}>
            {visibleDatedItems.map(renderBooking)}

            {query.isLoading && (
              <div className={styles.emptyState}>
                <span className={styles.emptyStateIcon}>
                  <span className={styles.loadingRing} />
                </span>
                <strong>{ar ? "جاري تحميل الحجوزات" : "Loading bookings"}</strong>
                <p>{ar ? "يتم تحديث قائمة المواعيد الآن." : "The appointment list is being refreshed."}</p>
              </div>
            )}

            {!query.isLoading
              && visibleDatedItems.length === 0
              && (
                <div className={styles.emptyState}>
                  <span className={styles.emptyStateIcon}>
                    <UiIcon name={appliedSearch ? "search" : "calendar"} size={22} />
                  </span>
                  <strong>
                    {appliedSearch
                      ? ar
                        ? "لا توجد نتائج مطابقة"
                        : "No matching bookings"
                      : ar
                        ? "لا توجد حجوزات لهذا اليوم"
                        : "No bookings for this day"}
                  </strong>
                  <p>
                    {appliedSearch
                      ? ar
                        ? "جرّب البحث باسم أو رقم هاتف مختلف."
                        : "Try a different name, phone number or patient code."
                      : ar
                        ? "يمكنك إضافة أول حجز من النموذج الموجود بجانب القائمة."
                        : "Add the first booking using the form beside this list."}
                  </p>
                </div>
              )}
          </div>

          {visibleUnscheduledItems.length > 0 && (
            <div className={styles.unscheduledSection}>
              <div className={styles.unscheduledTitle}>
                <div>
                  <UiIcon name="calendar" size={16} />
                  <strong>
                    {ar
                      ? "حجوزات بدون تاريخ"
                      : "Bookings without a date"}
                  </strong>
                </div>
                <span>{visibleUnscheduledItems.length}</span>
              </div>

              <div className={styles.bookingsList}>
                {visibleUnscheduledItems.map(renderBooking)}
              </div>
            </div>
          )}

          {statusMutation.isError && (
            <div className={styles.listError}>
              <UiIcon name="warning" size={16} />
              {errorMessage(statusMutation.error, ar)}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
