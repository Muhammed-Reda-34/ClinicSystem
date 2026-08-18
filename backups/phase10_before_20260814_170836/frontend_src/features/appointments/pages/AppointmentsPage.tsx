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
import {
  useLanguage,
} from "../../../i18n/LanguageContext";
import type {
  AppointmentAttendanceStatus,
} from "../../../types/clinical";
import {
  createPreliminaryBooking,
  getPreliminaryBookings,
  setPreliminaryBookingAttendance,
} from "../api/preliminaryBookingsApi";
import styles from "./AppointmentsPage.module.css";

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

export function AppointmentsPage() {
  const { language } = useLanguage();
  const ar = language === "ar";
  const client = useQueryClient();

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

  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({
        queryKey: [
          "preliminary-bookings",
        ],
      }),
      client.invalidateQueries({
        queryKey: ["dashboard"],
      }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: createPreliminaryBooking,
    onSuccess: async () => {
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
    onSuccess: refresh,
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

  const summary = useMemo(
    () => ({
      total: datedItems.length,
      attended: datedItems.filter(
        item =>
          item.attendanceStatus === 1,
      ).length,
      noShow: datedItems.filter(
        item =>
          item.attendanceStatus === 2,
      ).length,
      excused: datedItems.filter(
        item =>
          item.attendanceStatus === 3,
      ).length,
    }),
    [datedItems],
  );

  function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    createMutation.mutate({
      patientName: patientName.trim(),
      phoneNumber: phoneNumber.trim(),
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

    return (
      <article
        key={item.id}
        className={[
          styles.bookingRow,
          statusClass,
        ].join(" ")}
      >
        <div className={styles.bookingIdentity}>
          <strong>
            {item.patientName}
          </strong>

          <a
            href={`tel:${item.phoneNumber}`}
          >
            {item.phoneNumber}
          </a>
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
        </div>
      </article>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>
            Preliminary Booking
          </p>

          <h1>
            {ar
              ? "الحجز المبدئي"
              : "Preliminary Booking"}
          </h1>

          <p>
            {ar
              ? "تسجيل سريع قبل إنشاء ملف المريض. الاسم ورقم الهاتف مطلوبان، والتاريخ والوقت اختياريان."
              : "Quick booking before creating a patient profile. Name and phone are required; date and time are optional."}
          </p>
        </div>

        <label className={styles.dayPicker}>
          <span>
            {ar
              ? "عرض حجوزات يوم"
              : "Show bookings for"}
          </span>

          <input
            type="date"
            value={date}
            onChange={event => {
              const next =
                event.target.value;

              setDate(next);
              setVisitDate(next);
            }}
          />
        </label>
      </header>

      <div className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span>
            {ar ? "إجمالي اليوم" : "Day total"}
          </span>
          <strong>{summary.total}</strong>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryAttended}`}>
          <span>{ar ? "حضر" : "Attended"}</span>
          <strong>{summary.attended}</strong>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryNoShow}`}>
          <span>{ar ? "لم يحضر" : "No show"}</span>
          <strong>{summary.noShow}</strong>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryExcused}`}>
          <span>{ar ? "اعتذر" : "Excused"}</span>
          <strong>{summary.excused}</strong>
        </article>
      </div>

      <div className={styles.layout}>
        <form
          className={styles.formCard}
          onSubmit={submit}
        >
          <div className={styles.formHeading}>
            <span>01</span>
            <div>
              <h2>
                {ar
                  ? "إضافة حجز مبدئي"
                  : "Add preliminary booking"}
              </h2>
              <p>
                {ar
                  ? "متاح للسكرتيرة والممرضة فقط."
                  : "Available to secretary and nurse only."}
              </p>
            </div>
          </div>

          <label>
            <span>
              {ar ? "اسم المريض" : "Patient name"}
            </span>
            <input
              required
              maxLength={250}
              value={patientName}
              onChange={event =>
                setPatientName(
                  event.target.value,
                )
              }
              placeholder={ar ? "الاسم" : "Name"}
            />
          </label>

          <label>
            <span>
              {ar ? "رقم الهاتف" : "Phone number"}
            </span>
            <input
              required
              inputMode="tel"
              maxLength={30}
              value={phoneNumber}
              onChange={event =>
                setPhoneNumber(
                  event.target.value,
                )
              }
              placeholder="01xxxxxxxxx"
            />
          </label>

          <div className={styles.twoColumns}>
            <label>
              <span>
                {ar
                  ? "تاريخ الزيارة — اختياري"
                  : "Visit date — optional"}
              </span>
              <input
                type="date"
                value={visitDate}
                onChange={event =>
                  setVisitDate(
                    event.target.value,
                  )
                }
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
                onChange={event =>
                  setVisitTime(
                    event.target.value,
                  )
                }
              />
            </label>
          </div>

          {createMutation.isError && (
            <div className={styles.error}>
              {errorMessage(
                createMutation.error,
                ar,
              )}
            </div>
          )}

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={
              createMutation.isPending
              || !patientName.trim()
              || !phoneNumber.trim()
            }
          >
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
              <p>
                {date}
              </p>
            </div>

            <span>{datedItems.length}</span>
          </div>

          <div className={styles.bookingsList}>
            {datedItems.map(renderBooking)}

            {query.isLoading && (
              <div className={styles.emptyState}>
                {ar
                  ? "جاري التحميل..."
                  : "Loading..."}
              </div>
            )}

            {!query.isLoading
              && datedItems.length === 0
              && (
                <div className={styles.emptyState}>
                  {ar
                    ? "لا توجد حجوزات لهذا اليوم."
                    : "No bookings for this day."}
                </div>
              )}
          </div>

          {unscheduledItems.length > 0 && (
            <div className={styles.unscheduledSection}>
              <div className={styles.unscheduledTitle}>
                <strong>
                  {ar
                    ? "حجوزات بدون تاريخ"
                    : "Bookings without a date"}
                </strong>
                <span>
                  {unscheduledItems.length}
                </span>
              </div>

              <div className={styles.bookingsList}>
                {unscheduledItems.map(renderBooking)}
              </div>
            </div>
          )}

          {statusMutation.isError && (
            <div className={styles.listError}>
              {errorMessage(
                statusMutation.error,
                ar,
              )}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
