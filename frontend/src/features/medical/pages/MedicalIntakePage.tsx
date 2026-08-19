import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  useLanguage,
} from "../../../i18n/LanguageContext";
import {
  ClinicPageHeader,
} from "../../../components/ui/ClinicPageHeader";
import type {
  MedicalIntake,
  UpdateMedicalIntakePayload,
} from "../../../types/clinical";
import {
  getMedicalIntake,
  updateMedicalIntake,
} from "../api/medicalApi";
import styles from "./MedicalIntakePage.module.css";
import { SimpleDateInput } from "../../../components/forms/SimpleDateInput";

type FormState =
  UpdateMedicalIntakePayload;

function toForm(
  data: MedicalIntake,
): FormState {
  const {
    patientId: _patientId,
    updatedAtUtc: _updatedAtUtc,
    ...rest
  } = data;

  return {
    ...rest,
    formDate:
      rest.formDate
      ?? new Date()
        .toISOString()
        .slice(0, 10),
  };
}

export function MedicalIntakePage() {
  const { patientId } =
    useParams();

  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  const {
    t,
    language,
  } =
    useLanguage();

  const query =
    useQuery({
      queryKey: [
        "medical-intake",
        patientId,
      ],
      queryFn: () =>
        getMedicalIntake(
          patientId!,
        ),
      enabled:
        Boolean(patientId),
    });

  const [form, setForm] =
    useState<FormState | null>(
      null,
    );

  useEffect(() => {
    if (query.data) {
      setForm(
        toForm(query.data),
      );
    }
  }, [query.data]);

  const mutation =
    useMutation({
      mutationFn:
        (
          payload:
            UpdateMedicalIntakePayload,
        ) =>
          updateMedicalIntake(
            patientId!,
            payload,
          ),
      onSuccess:
        async () => {
          await Promise.all([
            queryClient
              .invalidateQueries({
                queryKey:
                  [
                    "patient",
                    patientId,
                  ],
              }),
            queryClient
              .invalidateQueries({
                queryKey:
                  [
                    "medical-intake",
                    patientId,
                  ],
              }),
          ]);

          navigate(
            `/patients/${patientId}`,
          );
        },
    });

  if (
    query.isLoading
    || !form
  ) {
    return (
      <div className={styles.state}>
        {t("loading")}
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className={styles.state}>
        {language === "ar"
          ? "تعذر تحميل الاستمارة."
          : "Unable to load the intake form."}
      </div>
    );
  }

  function setField<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm(
      current =>
        current
          ? {
              ...current,
              [key]: value,
            }
          : current,
    );
  }

  function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!form) {
      return;
    }

    mutation.mutate(form);
  }

  const conditions: Array<{
    key:
      | "hasHypertension"
      | "hasRheumaticFever"
      | "hasBloodDisease"
      | "hasLiverDisease"
      | "hasHepatitis"
      | "hasDiabetes"
      | "hasHeartDisease"
      | "hasKidneyDisease"
      | "hasThyroidDisease"
      | "hasCancer";
    label:
      | "hypertension"
      | "rheumaticFever"
      | "bloodDisease"
      | "liverDisease"
      | "hepatitis"
      | "diabetes"
      | "heartDisease"
      | "kidneyDisease"
      | "thyroidDisease"
      | "cancer";
  }> = [
    {
      key: "hasHypertension",
      label: "hypertension",
    },
    {
      key: "hasRheumaticFever",
      label: "rheumaticFever",
    },
    {
      key: "hasBloodDisease",
      label: "bloodDisease",
    },
    {
      key: "hasLiverDisease",
      label: "liverDisease",
    },
    {
      key: "hasHepatitis",
      label: "hepatitis",
    },
    {
      key: "hasDiabetes",
      label: "diabetes",
    },
    {
      key: "hasHeartDisease",
      label: "heartDisease",
    },
    {
      key: "hasKidneyDisease",
      label: "kidneyDisease",
    },
    {
      key: "hasThyroidDisease",
      label: "thyroidDisease",
    },
    {
      key: "hasCancer",
      label: "cancer",
    },
  ];


  const activeConditionCount = conditions.filter(
    condition => Boolean(form[condition.key]),
  ).length;

  return (
    <section className={styles.page}>
      <ClinicPageHeader
        eyebrow="Medical Intake"
        title={t("medicalIntake")}
        subtitle={query.data?.fullName}
        icon="patients"
        actions={
          <Link
            className={styles.back}
            to={`/patients/${patientId}`}
          >
            {t("cancel")}
          </Link>
        }
        metrics={[
          {
            label: language === "ar" ? "حالات صحية محددة" : "Health flags",
            value: activeConditionCount,
            icon: "warning",
            tone: activeConditionCount > 0 ? "warning" : "success",
          },
          {
            label: language === "ar" ? "حساسية أدوية" : "Drug allergy",
            value: form.hasDrugAllergy
              ? (language === "ar" ? "نعم" : "Yes")
              : (language === "ar" ? "لا" : "No"),
            icon: "services",
            tone: form.hasDrugAllergy ? "danger" : "success",
          },
          {
            label: language === "ar" ? "دخول مستشفى مؤخرًا" : "Recent hospital stay",
            value: form.hadRecentHospitalization
              ? (language === "ar" ? "نعم" : "Yes")
              : (language === "ar" ? "لا" : "No"),
            icon: "followUp",
            tone: form.hadRecentHospitalization ? "warning" : "neutral",
          },
          {
            label: language === "ar" ? "آخر تحديث" : "Last update",
            value: query.data?.updatedAtUtc
              ? new Date(query.data.updatedAtUtc).toLocaleDateString(language === "ar" ? "ar-EG" : "en-GB")
              : (language === "ar" ? "جديد" : "New"),
            icon: "calendar",
            tone: "neutral",
          },
        ]}
      />

      <form
        className={styles.form}
        onSubmit={submit}
      >
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span>01</span>
            <div>
              <h2>
                {t(
                  "basicInformation",
                )}
              </h2>
              <p>
                {language === "ar"
                  ? "تُستكمل عند حضور المريض للعيادة."
                  : "Completed when the patient arrives at the clinic."}
              </p>
            </div>
          </div>

          <div className={styles.grid}>
            <label>
              <span>
                {t("fullName")}
              </span>
              <input
                required
                maxLength={250}
                value={form.fullName}
                onChange={event =>
                  setField(
                    "fullName",
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              <span>
                {t("dateOfBirth")}
              </span>
              <SimpleDateInput
                max={new Date().toISOString().slice(0, 10)}
                value={form.dateOfBirth ?? ""}
                onChange={value => setField("dateOfBirth", value || null)}
              />
            </label>

            <label>
              <span>
                {t("phone")}
              </span>
              <input
                required
                dir="ltr"
                inputMode="tel"
                value={
                  form.phoneNumber
                }
                onChange={event =>
                  setField(
                    "phoneNumber",
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              <span>
                {t(
                  "alternatePhone",
                )}
              </span>
              <input
                dir="ltr"
                inputMode="tel"
                value={
                  form.alternatePhone
                  ?? ""
                }
                onChange={event =>
                  setField(
                    "alternatePhone",
                    event.target.value
                    || null,
                  )
                }
              />
            </label>

            <label>
              <span>
                {t("gender")}
              </span>
              <select
                value={
                  form.gender ?? ""
                }
                onChange={event =>
                  setField(
                    "gender",
                    event.target.value
                    || null,
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

            <label>
              <span>
                {t(
                  "maritalStatus",
                )}
              </span>
              <input
                value={
                  form.maritalStatus
                  ?? ""
                }
                onChange={event =>
                  setField(
                    "maritalStatus",
                    event.target.value
                    || null,
                  )
                }
              />
            </label>

            <label>
              <span>
                {t("occupation")}
              </span>
              <input
                value={
                  form.occupation
                  ?? ""
                }
                onChange={event =>
                  setField(
                    "occupation",
                    event.target.value
                    || null,
                  )
                }
              />
            </label>

            <label
              className={
                styles.fullWidth
              }
            >
              <span>
                {t("address")}
              </span>
              <input
                value={
                  form.address ?? ""
                }
                onChange={event =>
                  setField(
                    "address",
                    event.target.value
                    || null,
                  )
                }
              />
            </label>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span>02</span>
            <div>
              <h2>
                {t(
                  "medicalInformation",
                )}
              </h2>
              <p>
                {language === "ar"
                  ? "البيانات الصحية مأخوذة من الاستمارة المرفقة."
                  : "Health history from the supplied clinic intake form."}
              </p>
            </div>
          </div>

          <div className={styles.binaryQuestion}>
            <div>
              <strong>
                {t(
                  "drugAllergy",
                )}
              </strong>
            </div>

            <div className={styles.segmented}>
              <label>
                <input
                  type="radio"
                  name="drugAllergy"
                  checked={
                    form.hasDrugAllergy
                  }
                  onChange={() =>
                    setField(
                      "hasDrugAllergy",
                      true,
                    )
                  }
                />
                <span>
                  {t("yes")}
                </span>
              </label>

              <label>
                <input
                  type="radio"
                  name="drugAllergy"
                  checked={
                    !form.hasDrugAllergy
                  }
                  onChange={() => {
                    setField(
                      "hasDrugAllergy",
                      false,
                    );
                    setField(
                      "drugAllergyDetails",
                      null,
                    );
                  }}
                />
                <span>
                  {t("no")}
                </span>
              </label>
            </div>
          </div>

          {form.hasDrugAllergy && (
            <label className={styles.stackField}>
              <span>
                {t(
                  "drugAllergyDetails",
                )}
              </span>
              <textarea
                rows={3}
                value={
                  form.drugAllergyDetails
                  ?? ""
                }
                onChange={event =>
                  setField(
                    "drugAllergyDetails",
                    event.target.value
                    || null,
                  )
                }
              />
            </label>
          )}

          <h3 className={styles.subheading}>
            {language === "ar"
              ? "هل تعاني من:"
              : "Medical conditions"}
          </h3>

          <div className={styles.conditions}>
            {conditions.map(
              item => (
                <label
                  key={item.key}
                  className={
                    styles.condition
                  }
                >
                  <input
                    type="checkbox"
                    checked={
                      form[item.key]
                    }
                    onChange={event =>
                      setField(
                        item.key,
                        event.target.checked,
                      )
                    }
                  />
                  <span>
                    {t(item.label)}
                  </span>
                </label>
              ),
            )}
          </div>

          <label className={styles.stackField}>
            <span>
              {t(
                "otherConditions",
              )}
            </span>
            <textarea
              rows={3}
              value={
                form.otherConditions
                ?? ""
              }
              onChange={event =>
                setField(
                  "otherConditions",
                  event.target.value
                  || null,
                )
              }
            />
          </label>

          <div className={styles.binaryQuestion}>
            <div>
              <strong>
                {t(
                  "recentHospitalization",
                )}
              </strong>
            </div>

            <div className={styles.segmented}>
              <label>
                <input
                  type="radio"
                  name="hospitalized"
                  checked={
                    form.hadRecentHospitalization
                  }
                  onChange={() =>
                    setField(
                      "hadRecentHospitalization",
                      true,
                    )
                  }
                />
                <span>
                  {t("yes")}
                </span>
              </label>

              <label>
                <input
                  type="radio"
                  name="hospitalized"
                  checked={
                    !form.hadRecentHospitalization
                  }
                  onChange={() => {
                    setField(
                      "hadRecentHospitalization",
                      false,
                    );
                    setField(
                      "recentHospitalizationReason",
                      null,
                    );
                  }}
                />
                <span>
                  {t("no")}
                </span>
              </label>
            </div>
          </div>

          {form.hadRecentHospitalization && (
            <label className={styles.stackField}>
              <span>
                {t(
                  "hospitalizationReason",
                )}
              </span>
              <textarea
                rows={3}
                value={
                  form.recentHospitalizationReason
                  ?? ""
                }
                onChange={event =>
                  setField(
                    "recentHospitalizationReason",
                    event.target.value
                    || null,
                  )
                }
              />
            </label>
          )}

          <label className={styles.stackField}>
            <span>
              {t(
                "medicalNotes",
              )}
            </span>
            <textarea
              rows={4}
              value={
                form.medicalNotes
                ?? ""
              }
              onChange={event =>
                setField(
                  "medicalNotes",
                  event.target.value
                  || null,
                )
              }
            />
          </label>

          <div className={styles.grid}>
            <label>
              <span>
                {t(
                  "signatureName",
                )}
              </span>
              <input
                value={
                  form.patientSignatureName
                  ?? ""
                }
                onChange={event =>
                  setField(
                    "patientSignatureName",
                    event.target.value
                    || null,
                  )
                }
              />
            </label>

            <label>
              <span>
                {t("formDate")}
              </span>
              <SimpleDateInput
                value={form.formDate ?? new Date().toISOString().slice(0, 10)}
                onChange={value => setField("formDate", value || null)}
              />
            </label>
          </div>
        </section>

        {mutation.isError && (
          <div className={styles.error}>
            {language === "ar"
              ? "تعذر حفظ الاستمارة. راجع البيانات وحاول مرة أخرى."
              : "Unable to save the intake form."}
          </div>
        )}

        <footer className={styles.actions}>
          <Link
            to={`/patients/${patientId}`}
            className={styles.cancel}
          >
            {t("cancel")}
          </Link>

          <button
            type="submit"
            disabled={
              mutation.isPending
            }
          >
            {mutation.isPending
              ? t("saving")
              : t("save")}
          </button>
        </footer>
      </form>
    </section>
  );
}
