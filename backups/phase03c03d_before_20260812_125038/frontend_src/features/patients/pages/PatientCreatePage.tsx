import {
  useState,
} from "react";
import axios from "axios";
import {
  useNavigate,
} from "react-router-dom";
import {
  useLanguage,
} from "../../../i18n/LanguageContext";
import {
  useDoctorContext,
} from "../../context/DoctorContext";
import {
  PatientForm,
} from "../components/PatientForm";
import {
  createPatient,
} from "../api/patientsApi";
import styles from "./PatientFormPage.module.css";

export function PatientCreatePage() {
  const navigate =
    useNavigate();

  const { t, language } =
    useLanguage();

  const {
    doctors,
    selectedDoctor,
  } =
    useDoctorContext();

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            New Patient
          </p>

          <h1>
            {t("addPatient")}
          </h1>

          <p>
            {language === "ar"
              ? "التسجيل الأولي سريع، ويمكن استكمال البيانات لاحقًا داخل نفس البروفايل."
              : "Start with a quick registration and complete the same profile later."}
          </p>
        </div>
      </header>

      <PatientForm
        mode="create"
        doctors={doctors}
        defaultDoctorId={
          selectedDoctor
            ?.doctorId
        }
        submitting={submitting}
        errorMessage={error}
        onSubmit={async payload => {
          setSubmitting(true);
          setError("");

          try {
            const result =
              await createPatient(
                payload,
              );

            navigate(
              `/patients/${result.patientId}`,
            );
          } catch (
            requestError
          ) {
            if (
              axios.isAxiosError(
                requestError,
              )
            ) {
              const code =
                (
                  requestError
                    .response
                    ?.data as
                    | {
                        code?: string;
                        message?: string;
                      }
                    | undefined
                )?.code;

              if (
                code
                === "POTENTIAL_DUPLICATE"
              ) {
                setError(
                  t(
                    "duplicatePatient",
                  ),
                );
              } else if (
                code
                === "FORM_NUMBER_EXISTS"
              ) {
                setError(
                  t(
                    "formExists",
                  ),
                );
              } else {
                setError(
                  (
                  language === "ar"
                    ? "تعذر حفظ المريض. راجع البيانات وحاول مرة أخرى."
                    : "Unable to save the patient. Review the data and try again."
                ),
                );
              }
            } else {
              setError(
                (
                  language === "ar"
                    ? "تعذر حفظ المريض."
                    : "Unable to save the patient."
                ),
              );
            }
          } finally {
            setSubmitting(
              false,
            );
          }
        }}
      />
    </section>
  );
}
