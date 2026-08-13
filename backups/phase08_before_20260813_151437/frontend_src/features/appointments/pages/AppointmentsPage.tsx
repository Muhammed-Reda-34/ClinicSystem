import {
  useEffect,
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
  Link,
  useSearchParams,
} from "react-router-dom";
import {
  useLanguage,
} from "../../../i18n/LanguageContext";
import {
  getClinicSettings,
} from "../../settings/api/settingsApi";
import {
  toWhatsAppHref,
} from "../../patients/utils/whatsapp";
import {
  useDoctorContext,
} from "../../context/DoctorContext";
import {
  getPatient,
  getPatients,
} from "../../patients/api/patientsApi";
import {
  useDebouncedValue,
} from "../../patients/hooks/useDebouncedValue";
import type {
  AppointmentAttendanceStatus,
} from "../../../types/clinical";
import type {
  PatientListItem,
} from "../../../types/patients";
import {
  createAppointment,
  getAppointments,
  setAppointmentAttendance,
  rescheduleAppointment,
} from "../api/appointmentsApi";
import styles from "./AppointmentsPage.module.css";

const today =
  new Date()
  .toISOString()
  .slice(0, 10);

function toLocalDateTimeInput(
  utcValue: string,
) {
  const date =
    new Date(utcValue);

  const pad = (
    value: number,
  ) =>
    String(value)
      .padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(
      date.getMonth() + 1,
    ),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

function dayRange(
  date: string,
) {
  const from =
    new Date(
      `${date}T00:00:00`,
    );

  const to =
    new Date(
      `${date}T00:00:00`,
    );

  to.setDate(
    to.getDate() + 1,
  );

  return {
    fromUtc:
      from.toISOString(),
    toUtc:
      to.toISOString(),
  };
}

function statusLabel(
  status:
    AppointmentAttendanceStatus,
  t: (
    key:
      | "scheduled"
      | "attended"
      | "noShow"
      | "excused"
      | "cancelled",
  ) => string,
) {
  switch (status) {
    case 1:
      return t("attended");
    case 2:
      return t("noShow");
    case 3:
      return t("excused");
    case 4:
      return t("cancelled");
    default:
      return t("scheduled");
  }
}

export function AppointmentsPage() {
  const [
    searchParams,
  ] =
    useSearchParams();

  const requestedPatientId =
    searchParams.get(
      "patientId",
    );

  const {
    t,
    language,
  } =
    useLanguage();

  const {
    doctors,
    selectedDoctor,
  } =
    useDoctorContext();

  const queryClient =
    useQueryClient();

  const settingsQuery =
    useQuery({
      queryKey:
        ["clinic-settings"],
      queryFn:
        getClinicSettings,
      staleTime:
        5 * 60_000,
    });

  const [date, setDate] =
    useState(today);

  const [patientSearch, setPatientSearch] =
    useState("");

  const debouncedSearch =
    useDebouncedValue(
      patientSearch,
      280,
    );

  const [selectedPatient, setSelectedPatient] =
    useState<PatientListItem | null>(
      null,
    );

  const [doctorId, setDoctorId] =
    useState(
      selectedDoctor
        ?.doctorId
      ?? "",
    );

  const [scheduledLocal, setScheduledLocal] =
    useState(
      `${today}T10:00`,
    );

  const [duration, setDuration] =
    useState(30);

  const [reason, setReason] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [allowBlacklisted, setAllowBlacklisted] =
    useState(false);

  const [createError, setCreateError] =
    useState("");

  const [
    rescheduleId,
    setRescheduleId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    rescheduleLocal,
    setRescheduleLocal,
  ] =
    useState("");

  const [
    rescheduleDuration,
    setRescheduleDuration,
  ] =
    useState(30);

  const [
    rescheduleNotes,
    setRescheduleNotes,
  ] =
    useState("");

  const [
    rescheduleError,
    setRescheduleError,
  ] =
    useState("");

  const range =
    useMemo(
      () => dayRange(date),
      [date],
    );

  const appointmentsQuery =
    useQuery({
      queryKey: [
        "appointments",
        date,
        selectedDoctor
          ?.doctorId
        ?? "all",
      ],
      queryFn: () =>
        getAppointments(
          range.fromUtc,
          range.toUtc,
        ),
    });

  const patientsQuery =
    useQuery({
      queryKey: [
        "appointment-patient-search",
        debouncedSearch,
        selectedDoctor
          ?.doctorId
        ?? "all",
      ],
      queryFn: () =>
        getPatients({
          search:
            debouncedSearch,
          page: 1,
          pageSize: 8,
        }),
      enabled:
        debouncedSearch
          .trim()
          .length >= 2,
    });

  const requestedPatientQuery =
    useQuery({
      queryKey: [
        "appointment-requested-patient",
        requestedPatientId,
      ],
      queryFn: () =>
        getPatient(
          requestedPatientId!,
        ),
      enabled:
        Boolean(
          requestedPatientId,
        ),
    });

  useEffect(() => {
    const patient =
      requestedPatientQuery.data;

    if (!patient) {
      return;
    }

    setSelectedPatient({
      id:
        patient.id,
      patientCode:
        patient.patientCode,
      formNumber:
        patient.formNumber,
      fullName:
        patient.fullName,
      phoneNumber:
        patient.phoneNumber,
      dateOfBirth:
        patient.dateOfBirth,
      age:
        patient.age,
      profileStatus:
        patient.profileStatus,
      isBlacklisted:
        patient.isBlacklisted,
      noShowCount:
        patient.noShowCount,
      doctors:
        patient.doctors,
    });

    setPatientSearch(
      patient.fullName,
    );

    if (
      selectedDoctor?.doctorId
    ) {
      setDoctorId(
        selectedDoctor.doctorId,
      );
    } else if (
      patient.doctors.length
      === 1
    ) {
      setDoctorId(
        patient.doctors[0]
          .doctorId,
      );
    }
  }, [
    requestedPatientQuery.data,
    selectedDoctor?.doctorId,
  ]);

  const createMutation =
    useMutation({
      mutationFn:
        createAppointment,
      onSuccess:
        async () => {
          setSelectedPatient(null);
          setPatientSearch("");
          setReason("");
          setNotes("");
          setAllowBlacklisted(false);
          setCreateError("");

          await queryClient
            .invalidateQueries({
              queryKey:
                ["appointments"],
            });
        },
      onError:
        error => {
          if (
            axios.isAxiosError(
              error,
            )
          ) {
            const data =
              error.response
                ?.data as
                | {
                    code?: string;
                    message?: string;
                  }
                | undefined;

            if (
              data?.code
              === "BLACKLISTED_PATIENT"
            ) {
              setCreateError(
                language === "ar"
                  ? "المريض في البلاك ليست. فعّل خيار الحجز رغم التحذير إذا تقرر استقباله."
                  : "The patient is blacklisted. Confirm the override if the clinic decides to book.",
              );
              return;
            }

            if (
              data?.code
              === "DOCTOR_TIME_COLLISION"
            ) {
              setCreateError(
                language === "ar"
                  ? "يوجد موعد آخر للطبيب في نفس التوقيت."
                  : "The doctor already has an appointment at this time.",
              );
              return;
            }
          }

          setCreateError(
            language === "ar"
              ? "تعذر إنشاء الموعد."
              : "Unable to create appointment.",
          );
        },
    });

  const rescheduleMutation =
    useMutation({
      mutationFn:
        ({
          id,
          scheduledLocalValue,
          durationMinutes,
          rescheduleNotesValue,
        }: {
          id: string;
          scheduledLocalValue: string;
          durationMinutes: number;
          rescheduleNotesValue: string;
        }) =>
          rescheduleAppointment(
            id,
            {
              scheduledAtUtc:
                new Date(
                  scheduledLocalValue,
                ).toISOString(),
              durationMinutes,
              notes:
                rescheduleNotesValue
                || null,
            },
          ),
      onSuccess:
        async () => {
          setRescheduleId(null);
          setRescheduleError("");

          await queryClient
            .invalidateQueries({
              queryKey:
                ["appointments"],
            });
        },
      onError:
        error => {
          if (
            axios.isAxiosError(
              error,
            )
          ) {
            const data =
              error.response
                ?.data as
                | {
                    code?: string;
                    message?: string;
                  }
                | undefined;

            if (
              data?.code
              === "DOCTOR_TIME_COLLISION"
            ) {
              setRescheduleError(
                language === "ar"
                  ? "التوقيت الجديد متعارض مع موعد آخر لنفس الطبيب."
                  : "The new time conflicts with another appointment.",
              );
              return;
            }
          }

          setRescheduleError(
            language === "ar"
              ? "تعذر إعادة جدولة الموعد."
              : "Unable to reschedule appointment.",
          );
        },
    });

  const attendanceMutation =
    useMutation({
      mutationFn:
        ({
          id,
          status,
        }: {
          id: string;
          status:
            AppointmentAttendanceStatus;
        }) =>
          setAppointmentAttendance(
            id,
            status,
          ),
      onSuccess:
        async () => {
          await Promise.all([
            queryClient
              .invalidateQueries({
                queryKey:
                  ["appointments"],
              }),
            queryClient
              .invalidateQueries({
                queryKey:
                  ["patients"],
              }),
          ]);
        },
    });

  function submitAppointment(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !selectedPatient
      || !doctorId
    ) {
      return;
    }

    setCreateError("");

    createMutation.mutate({
      patientId:
        selectedPatient.id,
      doctorId,
      scheduledAtUtc:
        new Date(
          scheduledLocal,
        ).toISOString(),
      durationMinutes:
        duration,
      reason:
        reason || null,
      notes:
        notes || null,
      allowBlacklisted,
    });
  }

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>
            Scheduling
          </p>

          <h1>
            {language === "ar"
              ? "جدول الحجوزات"
              : "Booking Schedule"}
          </h1>

          <p>
            {language === "ar"
              ? "هذه الصفحة للحجز وتنظيم جدول اليوم وإعادة الجدولة. حالة «حضر / لم يحضر / اعتذر» موجودة أيضًا داخل بروفايل المريض لتكون أسهل وقت الاستقبال."
              : "Use this page to book and organize the clinic schedule. Attendance controls are also available directly in the patient profile."}
          </p>
        </div>

        <label className={styles.dayPicker}>
          <span>
            {t(
              "appointmentDate",
            )}
          </span>
          <input
            type="date"
            value={date}
            onChange={event =>
              setDate(
                event.target.value,
              )
            }
          />
        </label>
      </header>

      {requestedPatientQuery.data && (
        <div className={styles.patientContextBanner}>
          <div>
            <strong>
              {language === "ar"
                ? "الحجز لمريض محدد"
                : "Booking for patient"}
            </strong>
            <span>
              {requestedPatientQuery.data.fullName}
              {" • "}
              {requestedPatientQuery.data.phoneNumber}
            </span>
          </div>

          <Link
            to={`/patients/${requestedPatientQuery.data.id}`}
          >
            {language === "ar"
              ? "العودة لبروفايل المريض"
              : "Back to patient profile"}
          </Link>
        </div>
      )}

      <div className={styles.layout}>
        <section className={styles.bookingCard}>
          <h2>
            {t(
              "addAppointment",
            )}
          </h2>

          <form
            onSubmit={
              submitAppointment
            }
            className={
              styles.bookingForm
            }
          >
            <label>
              <span>
                {t("patient")}
              </span>

              <input
                value={
                  patientSearch
                }
                onChange={event => {
                  setPatientSearch(
                    event.target
                      .value,
                  );
                  setSelectedPatient(
                    null,
                  );
                }}
                placeholder={
                  t(
                    "searchPlaceholder",
                  )
                }
              />
            </label>

            {patientsQuery.data
              && !selectedPatient
              && (
                <div
                  className={
                    styles.searchResults
                  }
                >
                  {patientsQuery.data.items
                    .map(
                      patient => (
                        <button
                          type="button"
                          key={
                            patient.id
                          }
                          onClick={() => {
                            setSelectedPatient(
                              patient,
                            );
                            setPatientSearch(
                              patient.fullName,
                            );
                          }}
                        >
                          <span>
                            <strong>
                              {
                                patient.fullName
                              }
                            </strong>
                            <small>
                              {
                                patient.phoneNumber
                              }
                              {" • "}
                              {
                                patient.patientCode
                              }
                            </small>
                          </span>

                          {patient.isBlacklisted && (
                            <em>
                              {t(
                                "blacklist",
                              )}
                            </em>
                          )}
                        </button>
                      ),
                    )}
                </div>
              )}

            {selectedPatient?.isBlacklisted && (
              <div className={styles.blacklistWarning}>
                <strong>
                  {t(
                    "blacklistWarning",
                  )}
                </strong>
                <span>
                  {language === "ar"
                    ? `عدد مرات عدم الحضور: ${selectedPatient.noShowCount}`
                    : `No-show count: ${selectedPatient.noShowCount}`}
                </span>

                <label>
                  <input
                    type="checkbox"
                    checked={
                      allowBlacklisted
                    }
                    onChange={event =>
                      setAllowBlacklisted(
                        event.target
                          .checked,
                      )
                    }
                  />
                  <span>
                    {t(
                      "allowBlacklistedBooking",
                    )}
                  </span>
                </label>
              </div>
            )}

            <label>
              <span>
                {t(
                  "doctorContext",
                )}
              </span>

              <select
                required
                value={doctorId}
                onChange={event =>
                  setDoctorId(
                    event.target
                      .value,
                  )
                }
              >
                <option value="">
                  —
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
                      {
                        doctor.fullName
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            <div className={styles.twoCols}>
              <label>
                <span>
                  {t(
                    "appointmentDate",
                  )}
                </span>
                <input
                  required
                  type="datetime-local"
                  value={
                    scheduledLocal
                  }
                  onChange={event =>
                    setScheduledLocal(
                      event.target
                        .value,
                    )
                  }
                />
              </label>

              <label>
                <span>
                  {t(
                    "duration",
                  )}
                </span>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={duration}
                  onChange={event =>
                    setDuration(
                      Number(
                        event.target
                          .value,
                      ),
                    )
                  }
                />
              </label>
            </div>

            <label>
              <span>
                {t("reason")}
              </span>
              <input
                value={reason}
                onChange={event =>
                  setReason(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <label>
              <span>
                {t("notes")}
              </span>
              <textarea
                rows={3}
                value={notes}
                onChange={event =>
                  setNotes(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            {createError && (
              <div
                className={
                  styles.error
                }
              >
                {createError}
              </div>
            )}

            <button
              type="submit"
              className={
                styles.primary
              }
              disabled={
                !selectedPatient
                || !doctorId
                || createMutation
                  .isPending
              }
            >
              {createMutation
                .isPending
                ? t("saving")
                : t(
                  "addAppointment",
                )}
            </button>
          </form>
        </section>

        <section className={styles.listCard}>
          <div className={styles.listHeader}>
            <h2>
              {date}
            </h2>

            <span>
              {appointmentsQuery
                .data
                ?.length
              ?? 0}
            </span>
          </div>

          {appointmentsQuery.isLoading ? (
            <div className={styles.state}>
              {t("loading")}
            </div>
          ) : (
            <div className={styles.appointments}>
              {appointmentsQuery.data
                ?.map(
                  appointment => (
                    <article
                      key={
                        appointment.id
                      }
                      className={
                        styles.appointment
                      }
                    >
                      <div
                        className={
                          styles.time
                        }
                      >
                        {new Date(
                          appointment
                            .scheduledAtUtc,
                        )
                          .toLocaleTimeString(
                            language
                              === "ar"
                              ? "ar-EG"
                              : "en-GB",
                            {
                              hour:
                                "2-digit",
                              minute:
                                "2-digit",
                            },
                          )}
                      </div>

                      <div
                        className={
                          styles.appointmentBody
                        }
                      >
                        <div
                          className={
                            styles.patientLine
                          }
                        >
                          <Link
                            to={`/patients/${appointment.patientId}`}
                          >
                            {
                              appointment.patientName
                            }
                          </Link>

                          {appointment.isBlacklisted && (
                            <span
                              className={
                                styles.blackTag
                              }
                            >
                              {t(
                                "blacklist",
                              )}
                            </span>
                          )}
                        </div>

                        <small>
                          {
                            appointment.doctorName
                          }
                          {" • "}
                          {
                            appointment.phoneNumber
                          }
                        </small>

                        {appointment.reason && (
                          <p>
                            {
                              appointment.reason
                            }
                          </p>
                        )}

                        <div
                          className={
                            styles.currentStatus
                          }
                        >
                          {statusLabel(
                            appointment
                              .attendanceStatus,
                            t,
                          )}
                        </div>

                        <div
                          className={
                            styles.attendance
                          }
                        >
                          <button
                            type="button"
                            className={
                              appointment
                                .attendanceStatus
                              === 1
                                ? styles.selectedGood
                                : ""
                            }
                            onClick={() =>
                              attendanceMutation
                                .mutate({
                                  id:
                                    appointment.id,
                                  status: 1,
                                })
                            }
                          >
                            {t(
                              "attended",
                            )}
                          </button>

                          <button
                            type="button"
                            className={
                              appointment
                                .attendanceStatus
                              === 2
                                ? styles.selectedBad
                                : ""
                            }
                            onClick={() =>
                              attendanceMutation
                                .mutate({
                                  id:
                                    appointment.id,
                                  status: 2,
                                })
                            }
                          >
                            {t(
                              "noShow",
                            )}
                          </button>

                          <button
                            type="button"
                            className={
                              appointment
                                .attendanceStatus
                              === 3
                                ? styles.selectedNeutral
                                : ""
                            }
                            onClick={() =>
                              attendanceMutation
                                .mutate({
                                  id:
                                    appointment.id,
                                  status: 3,
                                })
                            }
                          >
                            {t(
                              "excused",
                            )}
                          </button>
                        </div>

                        <div className={styles.rescheduleActions}>
                          <a
                            href={toWhatsAppHref(
                              appointment.phoneNumber,
                              [
                                language === "ar"
                                  ? (
                                    settingsQuery.data
                                      ?.appointmentReminderTemplateAr
                                    ?? "مرحبًا، نذكرك بموعدك في العيادة."
                                  )
                                  : (
                                    settingsQuery.data
                                      ?.appointmentReminderTemplateEn
                                    ?? "Hello, this is a reminder for your clinic appointment."
                                  ),
                                appointment.patientName,
                                new Date(
                                  appointment.scheduledAtUtc,
                                ).toLocaleString(
                                  language === "ar"
                                    ? "ar-EG"
                                    : "en-GB",
                                  {
                                    dateStyle:
                                      "medium",
                                    timeStyle:
                                      "short",
                                  },
                                ),
                              ].join("\n"),
                            )}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {language === "ar"
                              ? "تذكير واتساب"
                              : "WhatsApp reminder"}
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              setRescheduleId(
                                current =>
                                  current
                                  === appointment.id
                                    ? null
                                    : appointment.id,
                              );

                              setRescheduleLocal(
                                toLocalDateTimeInput(
                                  appointment.scheduledAtUtc,
                                ),
                              );

                              setRescheduleDuration(
                                appointment.durationMinutes,
                              );

                              setRescheduleNotes(
                                appointment.notes
                                || "",
                              );

                              setRescheduleError("");
                            }}
                          >
                            {language === "ar"
                              ? "تعديل / إعادة جدولة"
                              : "Edit / Reschedule"}
                          </button>
                        </div>

                        {rescheduleId
                          === appointment.id
                          && (
                            <div className={styles.reschedulePanel}>
                              <label>
                                <span>
                                  {language === "ar"
                                    ? "التوقيت الجديد"
                                    : "New time"}
                                </span>
                                <input
                                  type="datetime-local"
                                  value={
                                    rescheduleLocal
                                  }
                                  onChange={event =>
                                    setRescheduleLocal(
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>

                              <label>
                                <span>
                                  {t("duration")}
                                </span>
                                <input
                                  type="number"
                                  min={5}
                                  max={240}
                                  value={
                                    rescheduleDuration
                                  }
                                  onChange={event =>
                                    setRescheduleDuration(
                                      Number(
                                        event.target.value,
                                      ),
                                    )
                                  }
                                />
                              </label>

                              <label className={styles.rescheduleNotes}>
                                <span>
                                  {t("notes")}
                                </span>
                                <input
                                  value={
                                    rescheduleNotes
                                  }
                                  onChange={event =>
                                    setRescheduleNotes(
                                      event.target.value,
                                    )
                                  }
                                />
                              </label>

                              {rescheduleError && (
                                <div className={styles.error}>
                                  {rescheduleError}
                                </div>
                              )}

                              <button
                                type="button"
                                className={styles.saveReschedule}
                                disabled={
                                  !rescheduleLocal
                                  || rescheduleMutation
                                    .isPending
                                }
                                onClick={() =>
                                  rescheduleMutation
                                    .mutate({
                                      id:
                                        appointment.id,
                                      scheduledLocalValue:
                                        rescheduleLocal,
                                      durationMinutes:
                                        rescheduleDuration,
                                      rescheduleNotesValue:
                                        rescheduleNotes,
                                    })
                                }
                              >
                                {language === "ar"
                                  ? "حفظ التعديل"
                                  : "Save changes"}
                              </button>
                            </div>
                          )}

                        {appointment
                          .attendanceStatus
                        === 1 && (
                          <Link
                            className={
                              styles.visitLink
                            }
                            to={`/patients/${appointment.patientId}/visits/new?appointmentId=${appointment.id}&doctorId=${appointment.doctorId}`}
                          >
                            {t(
                              "newVisit",
                            )}
                          </Link>
                        )}
                      </div>
                    </article>
                  ),
                )}

              {appointmentsQuery.data
                ?.length
                === 0 && (
                <div
                  className={
                    styles.state
                  }
                >
                  {t("noData")}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
