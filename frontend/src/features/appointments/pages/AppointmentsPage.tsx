import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
import axios from "axios";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppIcon } from "../../../components/icons/AppIcon";
import { ClinicPageHeader } from "../../../components/ui/ClinicPageHeader";
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
            ? `تنبيه: المريض موجود في البلاك ليست بعد ${data.noShowCount} مرات عدم حضور.`
            : `Warning: the patient is blacklisted after ${data.noShowCount} no-shows.`,
          patientId: data.patientId,
        });
      } else if (data.wasExistingPatient) {
        setNotice({
          tone: "info",
          text: ar
            ? "رقم الهاتف مسجل بالفعل. تم ربط الحجز بملف المريض الموجود بدل إنشاء ملف مكرر."
            : "This phone is already registered. The booking was linked to the existing patient instead of creating a duplicate.",
          patientId: data.patientId,
        });
      } else {
        setNotice({
          tone: "success",
          text: ar
            ? "تم حفظ الحجز وإنشاء ملف مبدئي للمريض."
            : "Booking saved and a preliminary patient profile was created.",
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
            ? `المريض دخل البلاك ليست تلقائيًا. عدد مرات عدم الحضور: ${data.noShowCount}.`
            : `The patient was automatically blacklisted. No-shows: ${data.noShowCount}.`,
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

    return (
      <article
        key={item.id}
        className={[
          styles.bookingRow,
          statusClass,
        ].join(" ")}
      >
        <div className={styles.bookingIdentity}>
          <div className={styles.identityLine}>
            <strong>{item.patientName}</strong>
            {item.isBlacklisted && (
              <span className={styles.blacklistBadge}>
                {ar ? "بلاك ليست" : "Blacklist"}
              </span>
            )}
          </div>

          <a href={`tel:${item.phoneNumber}`}>
            {item.phoneNumber}
          </a>

          <small>
            {item.patientCode ?? "—"}
            {item.doctorId
              ? ` • ${ar ? "الطبيب" : "Doctor"}: ${doctors.find(doctor => doctor.doctorId === item.doctorId)?.fullName ?? "—"}`
              : ""}
            {item.noShowCount > 0
              ? ` • ${ar ? "عدم حضور" : "No-shows"}: ${item.noShowCount}`
              : ""}
          </small>
        </div>

        <div className={styles.bookingDateTime}>
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
            {item.visitTime
              ? item.visitTime.slice(0, 5)
              : ar
                ? "بدون وقت"
                : "No time"}
          </small>
        </div>

        <div className={styles.statusBlock}>
          <span className={styles.statusPill}>
            {statusText(
              item.attendanceStatus,
              ar,
            )}
          </span>

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
                  {ar ? "استكمال بيانات المريض" : "Complete patient data"}
                </Link>
              )}

              <Link
                to={`/patients/${item.patientId}/visits/new`}
                className={styles.primaryAction}
              >
                {ar ? "زيارة جديدة" : "New visit"}
              </Link>
            </div>
          )}
        </div>
      </article>
    );
  }

  return (
    <section className={styles.page}>
      <ClinicPageHeader
        eyebrow="Preliminary Booking"
        title={ar ? "الحجز المبدئي" : "Preliminary Booking"}
        subtitle={
          ar
            ? "سجل المريض بسرعة، اختر الطبيب والموعد، وكمل الزيارة من نفس الحجز بدون خطوات زائدة."
            : "Register the patient quickly, choose the doctor and time, then continue to the visit without extra steps."
        }
        icon="calendar"
        badge={selectedDoctor?.fullName ?? (ar ? "كل الأطباء" : "All doctors")}
        actions={
          <label className={styles.dayPicker}>
            <span>{ar ? "عرض حجوزات يوم" : "Show bookings for"}</span>
            <SimpleDateInput
              value={date}
              onChange={next => {
                setDate(next);
                setVisitDate(next);
              }}
            />
          </label>
        }
        metrics={[
          {
            label: ar ? "إجمالي اليوم" : "Day total",
            value: summary.total,
            icon: "calendar",
            tone: "primary",
          },
          {
            label: ar ? "حضر" : "Attended",
            value: summary.attended,
            icon: "patients",
            tone: "success",
          },
          {
            label: ar ? "لم يحضر" : "No show",
            value: summary.noShow,
            icon: "warning",
            tone: summary.noShow > 0 ? "danger" : "neutral",
          },
          {
            label: ar ? "اعتذر" : "Excused",
            value: summary.excused,
            icon: "followUp",
            tone: "warning",
          },
        ]}
      />

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
          <strong>{notice.text}</strong>
          {notice.patientId && (
            <div>
              <Link to={`/patients/${notice.patientId}/medical-intake`}>
                {ar ? "استكمال البيانات" : "Complete data"}
              </Link>
              <Link to={`/patients/${notice.patientId}/visits/new`}>
                {ar ? "إضافة زيارة جديدة" : "Add new visit"}
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
          <div className={styles.formHeading}>
            <span><AppIcon name="plus" /></span>
            <div>
              <h2>
                {ar
                  ? "إضافة حجز مبدئي"
                  : "Add preliminary booking"}
              </h2>
              <p>
                {ar
                  ? "متاح للطبيب والسكرتيرة والممرضة."
                  : "Available to doctors, secretaries and nurses."}
              </p>
            </div>
          </div>

          <label>
            <span>{ar ? "الطبيب المسؤول" : "Responsible doctor"}</span>
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
            {doctors.length > 1 && (
              <small className={styles.scopeHint}>
                {ar
                  ? "نفس حساب السكرتيرة أو الممرضة يقدر يخدم أكثر من طبيب؛ اختر الطبيب الصحيح لكل حجز."
                  : "The same staff account can serve multiple doctors; choose the correct doctor for each booking."}
              </small>
            )}
          </label>

          {doctors.length > 1 && (
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
          )}

          <label>
            <span>{ar ? "اسم المريض" : "Patient name"}</span>
            <input
              required
              maxLength={250}
              value={patientName}
              onChange={event => setPatientName(event.target.value)}
              placeholder={ar ? "الاسم" : "Name"}
            />
          </label>

          <label>
            <span>{ar ? "رقم الهاتف" : "Phone number"}</span>
            <input
              required
              inputMode="tel"
              maxLength={30}
              value={phoneNumber}
              onChange={event => setPhoneNumber(event.target.value)}
              placeholder="01xxxxxxxxx"
            />
          </label>

          {phoneCheckQuery.isFetching && phoneDigits.length >= 7 && (
            <small className={styles.phoneChecking}>
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
              <div>
                <strong>
                  {existingPhoneMatch.isBlacklisted
                    ? ar
                      ? "المريض مسجل بالفعل وموجود في البلاك ليست"
                      : "Patient already exists and is blacklisted"
                    : ar
                      ? "المريض مسجل بالفعل"
                      : "Patient already registered"}
                </strong>
                <span>
                  {existingPhoneMatch.fullName} • {existingPhoneMatch.patientCode}
                </span>
              </div>

              <Link to={`/patients/${existingPhoneMatch.id}/visits/new`}>
                {ar ? "إضافة زيارة جديدة" : "Add new visit"}
              </Link>
            </div>
          )}

          {!existingPhoneMatch
            && phoneCheckQuery.data?.exists
            && phoneDigits.length >= 7 && (
              <div className={styles.existingPatient}>
                <strong>
                  {ar
                    ? "رقم الهاتف موجود بالفعل في النظام وسيتم ربط الحجز بالملف الموجود."
                    : "This phone already exists and the booking will be linked to the existing file."}
                </strong>
              </div>
            )}

          <div className={styles.twoColumns}>
            <label>
              <span>
                {ar
                  ? "تاريخ الزيارة — اختياري"
                  : "Visit date — optional"}
              </span>
              <SimpleDateInput
                value={visitDate}
                onChange={setVisitDate}
              />
            </label>

            <label>
              <span>
                {ar
                  ? "الوقت — اختياري"
                  : "Time — optional"}
              </span>
              <input
                type="time"
                value={visitTime}
                onChange={event => setVisitTime(event.target.value)}
              />
            </label>
          </div>

          {createMutation.isError && (
            <div className={styles.error}>
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
            {!createMutation.isPending && <AppIcon name="plus" />}
            {createMutation.isPending
              ? ar
                ? "جاري الحفظ..."
                : "Saving..."
              : ar
                ? "حفظ الحجز المبدئي"
                : "Save preliminary booking"}
          </button>
        </form>

        <section className={styles.listCard}>
          <div className={styles.listHeader}>
            <div>
              <h2>
                {ar
                  ? "حجوزات اليوم المحدد"
                  : "Selected day bookings"}
              </h2>
              <p>{date}</p>
            </div>

            <span>{datedItems.length}</span>
          </div>

          <form
            className={styles.searchBar}
            onSubmit={event => {
              event.preventDefault();
              setAppliedSearch(searchDraft.trim());
            }}
          >
            <input
              value={searchDraft}
              onChange={event => setSearchDraft(event.target.value)}
              placeholder={
                ar
                  ? "ابحث بالاسم أو رقم الهاتف أو كود المريض"
                  : "Search by name, phone or patient code"
              }
            />
            <button type="submit">
              <AppIcon name="search" />
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
                {ar ? "مسح" : "Clear"}
              </button>
            )}
          </form>

          <div className={styles.bookingsList}>
            {visibleDatedItems.map(renderBooking)}

            {query.isLoading && (
              <div className={styles.emptyState}>
                {ar ? "جاري التحميل..." : "Loading..."}
              </div>
            )}

            {!query.isLoading
              && visibleDatedItems.length === 0
              && (
                <div className={styles.emptyState}>
                  {appliedSearch
                    ? ar
                      ? "لا توجد نتائج مطابقة للبحث."
                      : "No matching bookings."
                    : ar
                      ? "لا توجد حجوزات لهذا اليوم."
                      : "No bookings for this day."}
                </div>
              )}
          </div>

          {visibleUnscheduledItems.length > 0 && (
            <div className={styles.unscheduledSection}>
              <div className={styles.unscheduledTitle}>
                <strong>
                  {ar
                    ? "حجوزات بدون تاريخ"
                    : "Bookings without a date"}
                </strong>
                <span>{visibleUnscheduledItems.length}</span>
              </div>

              <div className={styles.bookingsList}>
                {visibleUnscheduledItems.map(renderBooking)}
              </div>
            </div>
          )}

          {statusMutation.isError && (
            <div className={styles.listError}>
              {errorMessage(statusMutation.error, ar)}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
