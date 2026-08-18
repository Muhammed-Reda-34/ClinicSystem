import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  useQuery,
} from "@tanstack/react-query";
import {
  Link,
} from "react-router-dom";
import {
  useLanguage,
} from "../../../i18n/LanguageContext";
import type {
  AccessibleDoctor,
} from "../../../types/context";
import type {
  PatientPayload,
} from "../../../types/patients";
import {
  checkPatientPhone,
} from "../api/patientsApi";
import {
  useDebouncedValue,
} from "../hooks/useDebouncedValue";
import {
  detectPhone,
} from "../utils/phoneDetection";
import styles from "./PatientForm.module.css";

export type PatientFormValues = {
  fullName: string;
  phoneNumber: string;
  formNumber: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  administrativeNotes: string;
  doctorIds: string[];
};

function createEmptyValues(
  defaultDoctorId?: string | null,
): PatientFormValues {
  return {
    fullName: "",
    phoneNumber: "",
    formNumber: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    administrativeNotes: "",
    doctorIds:
      defaultDoctorId
        ? [defaultDoctorId]
        : [],
  };
}

export function PatientForm({
  mode,
  doctors,
  defaultDoctorId,
  initialValues,
  initialPhone,
  submitting,
  errorMessage,
  onSubmit,
}: {
  mode: "create" | "edit";
  doctors: AccessibleDoctor[];
  defaultDoctorId?: string | null;
  initialValues?: PatientFormValues;
  initialPhone?: string;
  submitting: boolean;
  errorMessage?: string;
  onSubmit: (
    payload: PatientPayload,
    markBasicCompleted: boolean,
  ) => Promise<void>;
}) {
  const { t, language } =
    useLanguage();

  const [values, setValues] =
    useState<PatientFormValues>(
      initialValues
      ?? createEmptyValues(
        defaultDoctorId,
      ),
    );

  const [
    markBasicCompleted,
    setMarkBasicCompleted,
  ] = useState(
    mode === "edit",
  );

  useEffect(() => {
    if (initialValues) {
      setValues(
        initialValues,
      );
    }
  }, [initialValues]);

  const phoneDetection =
    useMemo(
      () =>
        detectPhone(
          values.phoneNumber,
        ),
      [values.phoneNumber],
    );

  const debouncedPhone =
    useDebouncedValue(
      values.phoneNumber,
      400,
    );

  const digits =
    debouncedPhone.replace(
      /\D/g,
      "",
    );

  const shouldCheckPhone =
    phoneDetection.valid
    && digits.length >= 7
    && (
      mode === "create"
      || debouncedPhone
        !== initialPhone
    );

  const phoneQuery =
    useQuery({
      queryKey: [
        "patient-phone-check",
        debouncedPhone,
      ],
      queryFn: () =>
        checkPatientPhone(
          debouncedPhone,
        ),
      enabled:
        shouldCheckPhone,
      retry: 0,
    });

  const selectedDoctors =
    useMemo(
      () =>
        new Set(
          values.doctorIds,
        ),
      [values.doctorIds],
    );

  function setField(
    field:
      keyof PatientFormValues,
    value:
      | string
      | string[],
  ) {
    setValues(
      current => ({
        ...current,
        [field]: value,
      }),
    );
  }

  function toggleDoctor(
    doctorId: string,
  ) {
    const next =
      new Set(
        values.doctorIds,
      );

    if (
      next.has(doctorId)
    ) {
      next.delete(doctorId);
    } else {
      next.add(doctorId);
    }

    setField(
      "doctorIds",
      [...next],
    );
  }

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !phoneDetection.valid
    ) {
      return;
    }

    await onSubmit(
      {
        fullName:
          values.fullName,
        phoneNumber:
          values.phoneNumber,
        formNumber:
          values.formNumber
          || null,
        dateOfBirth:
          values.dateOfBirth
          || null,
        gender:
          values.gender
          || null,
        address:
          values.address
          || null,
        administrativeNotes:
          values.administrativeNotes
          || null,
        doctorIds:
          values.doctorIds,
      },
      markBasicCompleted,
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
    >
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.step}>
            01
          </span>

          <div>
            <h2>
              {mode === "create"
                ? t(
                  "quickRegistration",
                )
                : t(
                  "basicInformation",
                )}
            </h2>

            <p>
              {mode === "create"
                ? (
                  language === "ar"
                    ? "الاسم ورقم الهاتف يكفوا للتسجيل الأولي، ويمكن استكمال باقي البيانات عند حضور المريض."
                    : "Name and phone are enough for pre-registration. Complete the rest when the patient arrives."
                )
                : (
                  language === "ar"
                    ? "حدّث بيانات المريض بدون إنشاء ملف جديد."
                    : "Update the existing patient profile without creating a duplicate."
                )}
            </p>
          </div>
        </div>

        <div className={styles.grid}>
          <label className={styles.field}>
            <span>
              {t("fullName")} *
            </span>

            <input
              value={
                values.fullName
              }
              maxLength={250}
              required
              onChange={event =>
                setField(
                  "fullName",
                  event.target.value,
                )
              }
            />
          </label>

          <label className={styles.field}>
            <span>
              {t("phone")} *
            </span>

            <input
              value={
                values.phoneNumber
              }
              maxLength={30}
              required
              inputMode="tel"
              dir="ltr"
              onChange={event =>
                setField(
                  "phoneNumber",
                  event.target.value,
                )
              }
            />

            {values.phoneNumber.trim() && (
              <small
                className={
                  phoneDetection.valid
                    ? styles.phoneDetected
                    : styles.phoneInvalid
                }
              >
                {language === "ar"
                  ? (
                    phoneDetection.errorAr
                    ?? phoneDetection.labelAr
                  )
                  : (
                    phoneDetection.errorEn
                    ?? phoneDetection.labelEn
                  )}
              </small>
            )}
          </label>
        </div>

        {phoneQuery.data?.exists && (
          <div className={styles.warning}>
            <strong>
              {t("phoneExists")}
            </strong>

            {phoneQuery.data
              .visibleMatches
              .map(
                match => (
                  <Link
                    key={match.id}
                    to={`/patients/${match.id}`}
                  >
                    {match.fullName}
                    {" — "}
                    {match.patientCode}
                    {match.isBlacklisted
                      ? ` — ${t("blacklisted")}`
                      : ""}
                  </Link>
                ),
              )}

            {phoneQuery.data
              .hasHiddenClinicMatch && (
              <span>
                {t(
                  "hiddenPhoneMatch",
                )}
              </span>
            )}
          </div>
        )}

        <div className={styles.doctorBlock}>
          <div className={styles.labelTitle}>
            {t("doctors")} *
          </div>

          <div className={styles.doctorGrid}>
            {doctors.map(
              doctor => (
                <label
                  key={
                    doctor.doctorId
                  }
                  className={[
                    styles.doctorOption,
                    selectedDoctors
                      .has(
                        doctor.doctorId,
                      )
                      ? styles.doctorSelected
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={
                      selectedDoctors
                        .has(
                          doctor.doctorId,
                        )
                    }
                    onChange={() =>
                      toggleDoctor(
                        doctor.doctorId,
                      )
                    }
                  />

                  <span>
                    <strong>
                      {doctor.fullName}
                    </strong>

                    <small>
                      {doctor.specialization
                        || (
                          doctor.isOwner
                            ? t(
                              "ownerDoctor",
                            )
                            : t(
                              "doctor",
                            )
                        )}
                    </small>
                  </span>
                </label>
              ),
            )}
          </div>

          {values.doctorIds
            .length === 0 && (
            <small
              className={styles.requiredHint}
            >
              {t(
                "chooseDoctor",
              )}
            </small>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.step}>
            02
          </span>

          <div>
            <h2>
              {t(
                "fullRegistration",
              )}
            </h2>

            <p>
              {language === "ar"
                ? "يمكن استكمالها عند وصول المريض للعيادة."
                : "These fields can be completed when the patient arrives at the clinic."}
            </p>
          </div>
        </div>

        <div className={styles.grid}>
          <label className={styles.field}>
            <span>
              {t("formNumber")}
            </span>

            <input
              value={
                values.formNumber
              }
              maxLength={80}
              onChange={event =>
                setField(
                  "formNumber",
                  event.target.value,
                )
              }
            />
          </label>

          <label className={styles.field}>
            <span>
              {t(
                "dateOfBirth",
              )}
            </span>

            <input
              type="date"
              max={new Date()
                .toISOString()
                .slice(0, 10)}
              value={
                values.dateOfBirth
              }
              onChange={event =>
                setField(
                  "dateOfBirth",
                  event.target.value,
                )
              }
            />
          </label>

          <label className={styles.field}>
            <span>
              {t("gender")}
            </span>

            <select
              value={
                values.gender
              }
              onChange={event =>
                setField(
                  "gender",
                  event.target.value,
                )
              }
            >
              <option value="">
                —
              </option>

              <option value="Male">
                {t("male")}
              </option>

              <option value="Female">
                {t("female")}
              </option>
            </select>
          </label>

          <label
            className={[
              styles.field,
              styles.fullWidth,
            ].join(" ")}
          >
            <span>
              {t("address")}
            </span>

            <input
              value={
                values.address
              }
              maxLength={600}
              onChange={event =>
                setField(
                  "address",
                  event.target.value,
                )
              }
            />
          </label>

          <label
            className={[
              styles.field,
              styles.fullWidth,
            ].join(" ")}
          >
            <span>
              {t("notes")}
            </span>

            <textarea
              rows={4}
              value={
                values.administrativeNotes
              }
              maxLength={2000}
              onChange={event =>
                setField(
                  "administrativeNotes",
                  event.target.value,
                )
              }
            />
          </label>
        </div>

        <label className={styles.completeToggle}>
          <input
            type="checkbox"
            checked={
              markBasicCompleted
            }
            onChange={event =>
              setMarkBasicCompleted(
                event.target.checked,
              )
            }
          />

          <span>
            {t(
              "markBasicCompleted",
            )}
          </span>
        </label>
      </section>

      {errorMessage && (
        <div
          className={styles.error}
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <footer className={styles.actions}>
        <Link
          to={
            mode === "create"
              ? "/patients"
              : ".."
          }
          className={styles.cancel}
        >
          {t("cancel")}
        </Link>

        <button
          type="submit"
          className={styles.save}
          disabled={
            submitting
            || !phoneDetection.valid
            || values.doctorIds
              .length === 0
          }
        >
          {submitting
            ? t("saving")
            : t("save")}
        </button>
      </footer>
    </form>
  );
}
