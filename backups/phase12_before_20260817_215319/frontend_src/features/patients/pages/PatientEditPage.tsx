import {
  useMemo,
  useState,
} from "react";
import axios from "axios";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  useQuery,
} from "@tanstack/react-query";
import {
  useLanguage,
} from "../../../i18n/LanguageContext";
import {
  useDoctorContext,
} from "../../context/DoctorContext";
import {
  PatientForm,
  type PatientFormValues,
} from "../components/PatientForm";
import {
  getPatient,
  updatePatient,
} from "../api/patientsApi";
import styles from "./PatientFormPage.module.css";

export function PatientEditPage() {
  const { patientId } =
    useParams();

  const navigate =
    useNavigate();

  const { t, language } =
    useLanguage();

  const { doctors } =
    useDoctorContext();

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

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

  const initialValues =
    useMemo<
      PatientFormValues
      | undefined
    >(
      () => {
        if (!query.data) {
          return undefined;
        }

        return {
          fullName:
            query.data.fullName,
          phoneNumber:
            query.data.phoneNumber,
          formNumber:
            query.data.formNumber
            ?? "",
          dateOfBirth:
            query.data.dateOfBirth
            ?? "",
          gender:
            query.data.gender
            ?? "",
          address:
            query.data.address
            ?? "",
          administrativeNotes:
            query.data
              .administrativeNotes
            ?? "",
          doctorIds:
            query.data.doctors
            .map(
              doctor =>
                doctor.doctorId,
            ),
        };
      },
      [query.data],
    );

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
    || !initialValues
  ) {
    return (
      <div className={styles.state}>
        {language === "ar"
          ? "تعذر تحميل المريض."
          : "Unable to load the patient."}
      </div>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Patient Profile
          </p>

          <h1>
            {t("edit")}
            {" — "}
            {query.data.fullName}
          </h1>

          <p>
            {query.data.patientCode}
          </p>
        </div>
      </header>

      <PatientForm
        mode="edit"
        doctors={doctors}
        initialValues={initialValues}
        initialPhone={
          query.data.phoneNumber
        }
        submitting={submitting}
        errorMessage={error}
        onSubmit={async (
          payload,
          markBasicCompleted,
        ) => {
          setSubmitting(true);
          setError("");

          try {
            await updatePatient(
              patientId!,
              {
                ...payload,
                markBasicCompleted,
              },
            );

            navigate(
              `/patients/${patientId}`,
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
                      }
                    | undefined
                )?.code;

              setError(
                code
                  === "FORM_NUMBER_EXISTS"
                  ? t(
                    "formExists",
                  )
                  : (
                    language === "ar"
                      ? "تعذر تحديث بيانات المريض."
                      : "Unable to update patient data."
                  ),
              );
            } else {
              setError(
                (
                    language === "ar"
                      ? "تعذر تحديث بيانات المريض."
                      : "Unable to update patient data."
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
