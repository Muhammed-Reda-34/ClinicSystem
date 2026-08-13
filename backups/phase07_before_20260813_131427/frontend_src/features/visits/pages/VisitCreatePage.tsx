import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
import axios from "axios";
import {
  useQuery,
} from "@tanstack/react-query";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  useLanguage,
} from "../../../i18n/LanguageContext";
import {
  useDoctorContext,
} from "../../context/DoctorContext";
import {
  getPatient,
} from "../../patients/api/patientsApi";
import {
  getDentalServices,
} from "../../services/api/servicesApi";
import type {
  CreateVisitTreatment,
} from "../../../types/clinical";
import {
  DentalChart,
} from "../components/DentalChart";
import {
  createPatientVisit,
} from "../api/visitsApi";
import styles from "./VisitCreatePage.module.css";

type DraftTreatment =
  CreateVisitTreatment & {
    localId: string;
    serviceName: string;
    unitPrice: number;
  };

export function VisitCreatePage() {
  const { patientId } =
    useParams();

  const [searchParams] =
    useSearchParams();

  const navigate =
    useNavigate();

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

  const appointmentId =
    searchParams.get(
      "appointmentId",
    );

  const doctorFromQuery =
    searchParams.get(
      "doctorId",
    );

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

  const servicesQuery =
    useQuery({
      queryKey: [
        "dental-services",
        "active",
      ],
      queryFn: () =>
        getDentalServices(
          false,
        ),
    });

  const [doctorId, setDoctorId] =
    useState(
      doctorFromQuery
      ?? selectedDoctor
        ?.doctorId
      ?? "",
    );

  const [serviceId, setServiceId] =
    useState("");

  const [quantity, setQuantity] =
    useState(1);

  const [selectedTeeth, setSelectedTeeth] =
    useState<number[]>([]);

  const [treatments, setTreatments] =
    useState<DraftTreatment[]>(
      [],
    );

  const [clinicalNotes, setClinicalNotes] =
    useState("");

  const [discount, setDiscount] =
    useState(0);

  const [extra, setExtra] =
    useState(0);

  const [extraReason, setExtraReason] =
    useState("");

  const [initialPayment, setInitialPayment] =
    useState(0);

  const [paymentMethod, setPaymentMethod] =
    useState("");

  const [followUpLocal, setFollowUpLocal] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const selectedService =
    servicesQuery.data
      ?.find(
        service =>
          service.id
          === serviceId,
      )
    ?? null;

  const subtotal =
    useMemo(
      () =>
        treatments.reduce(
          (sum, item) =>
            sum
            + item.unitPrice
              * item.quantity,
          0,
        ),
      [treatments],
    );

  const total =
    Math.max(
      0,
      subtotal
      - discount
      + extra,
    );

  function addTreatment() {
    if (!selectedService) {
      return;
    }

    setTreatments(
      current => [
        ...current,
        {
          localId:
            crypto.randomUUID(),
          dentalServiceId:
            selectedService.id,
          quantity:
            Math.max(
              1,
              quantity,
            ),
          toothNumbers:
            selectedTeeth,
          notes: null,
          serviceName:
            language === "ar"
              ? selectedService
                .nameAr
              : (
                selectedService
                  .nameEn
                || selectedService
                  .nameAr
              ),
          unitPrice:
            selectedService
              .currentPrice,
        },
      ],
    );

    setServiceId("");
    setQuantity(1);
    setSelectedTeeth([]);
  }

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !patientId
      || !doctorId
      || treatments.length
        === 0
    ) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await createPatientVisit({
        patientId,
        doctorId,
        appointmentId:
          appointmentId
          || null,
        visitDateUtc:
          new Date()
            .toISOString(),
        clinicalNotes:
          clinicalNotes
          || null,
        discountAmount:
          discount,
        extraAmount:
          extra,
        extraReason:
          extraReason
          || null,
        followUpAtUtc:
          followUpLocal
            ? new Date(
                followUpLocal,
              ).toISOString()
            : null,
        treatments:
          treatments.map(
            item => ({
              dentalServiceId:
                item.dentalServiceId,
              quantity:
                item.quantity,
              toothNumbers:
                item.toothNumbers,
              notes:
                item.notes,
            }),
          ),
        initialPayment,
        paymentMethod:
          paymentMethod
          || null,
      });

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
        const message =
          (
            requestError
              .response
              ?.data as
              | {
                  message?: string;
                }
              | undefined
          )?.message;

        setError(
          message
          ?? (
            language === "ar"
              ? "تعذر حفظ الزيارة."
              : "Unable to save visit."
          ),
        );
      } else {
        setError(
          language === "ar"
            ? "تعذر حفظ الزيارة."
            : "Unable to save visit.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (
    patientQuery.isLoading
    || servicesQuery.isLoading
  ) {
    return (
      <div className={styles.state}>
        {t("loading")}
      </div>
    );
  }

  if (
    !patientQuery.data
    || servicesQuery.isError
  ) {
    return (
      <div className={styles.state}>
        {language === "ar"
          ? "تعذر تجهيز الزيارة."
          : "Unable to prepare visit."}
      </div>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Clinical Visit
          </p>

          <h1>
            {t("newVisit")}
          </h1>

          <p>
            {
              patientQuery
                .data
                .fullName
            }
            {" • "}
            {
              patientQuery
                .data
                .patientCode
            }
          </p>
        </div>

        <Link
          className={styles.back}
          to={`/patients/${patientId}`}
        >
          {t("cancel")}
        </Link>
      </header>

      <form
        className={styles.form}
        onSubmit={submit}
      >
        <section className={styles.card}>
          <div className={styles.sectionTitle}>
            <span>01</span>
            <div>
              <h2>
                {t(
                  "treatment",
                )}
              </h2>
              <p>
                {language === "ar"
                  ? "اختر الخدمة ثم الأسنان المطلوبة. الخدمات العامة يمكن إضافتها بدون تحديد سن."
                  : "Select a service and teeth. General services can be added without tooth selection."}
              </p>
            </div>
          </div>

          <label className={styles.field}>
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
                    {doctor.fullName}
                  </option>
                ),
              )}
            </select>
          </label>

          <div className={styles.serviceBuilder}>
            <label className={styles.field}>
              <span>
                {t(
                  "serviceCatalog",
                )}
              </span>
              <select
                value={serviceId}
                onChange={event =>
                  setServiceId(
                    event.target
                      .value,
                  )
                }
              >
                <option value="">
                  —
                </option>

                {servicesQuery.data
                  ?.map(
                    service => (
                      <option
                        key={
                          service.id
                        }
                        value={
                          service.id
                        }
                      >
                        {language
                          === "ar"
                          ? service.nameAr
                          : (
                            service.nameEn
                            || service.nameAr
                          )}
                        {" — "}
                        {service.currentPrice}
                      </option>
                    ),
                  )}
              </select>
            </label>

            <label className={styles.field}>
              <span>
                {t(
                  "quantity",
                )}
              </span>
              <input
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={event =>
                  setQuantity(
                    Number(
                      event.target
                        .value,
                    ),
                  )
                }
              />
            </label>
          </div>

          {selectedService && (
            <div className={styles.priceHint}>
              <strong>
                {selectedService
                  .currentPrice
                  .toLocaleString()}
              </strong>
              <span>
                {selectedService
                  .pricingNoteAr
                  || ""}
              </span>
            </div>
          )}

          <DentalChart
            selectedTeeth={
              selectedTeeth
            }
            onChange={
              setSelectedTeeth
            }
          />

          <button
            type="button"
            className={styles.addTreatment}
            disabled={
              !selectedService
            }
            onClick={
              addTreatment
            }
          >
            {t(
              "addTreatment",
            )}
          </button>

          <div className={styles.treatmentList}>
            {treatments.map(
              item => (
                <article
                  key={
                    item.localId
                  }
                  className={
                    styles.treatmentRow
                  }
                >
                  <div>
                    <strong>
                      {
                        item.serviceName
                      }
                    </strong>
                    <small>
                      {item.toothNumbers
                        .length > 0
                        ? `${t(
                            "selectedTeeth",
                          )}: ${item.toothNumbers.join(
                            ", ",
                          )}`
                        : (
                          language
                            === "ar"
                            ? "بدون سن محدد"
                            : "No specific tooth"
                        )}
                    </small>
                  </div>

                  <div
                    className={
                      styles.linePrice
                    }
                  >
                    {(
                      item.unitPrice
                      * item.quantity
                    ).toLocaleString()}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setTreatments(
                        current =>
                          current
                            .filter(
                              x =>
                                x.localId
                                !== item.localId,
                            ),
                      )
                    }
                  >
                    ×
                  </button>
                </article>
              ),
            )}

            {treatments.length === 0 && (
              <div className={styles.empty}>
                {t("noData")}
              </div>
            )}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionTitle}>
            <span>02</span>
            <div>
              <h2>
                {language === "ar"
                  ? "الحساب والمتابعة"
                  : "Billing & follow-up"}
              </h2>
            </div>
          </div>

          <div className={styles.financialGrid}>
            <label className={styles.field}>
              <span>
                {t("discount")}
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={discount}
                onChange={event =>
                  setDiscount(
                    Number(
                      event.target
                        .value,
                    ),
                  )
                }
              />
            </label>

            <label className={styles.field}>
              <span>
                {t(
                  "extraAmount",
                )}
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={extra}
                onChange={event =>
                  setExtra(
                    Number(
                      event.target
                        .value,
                    ),
                  )
                }
              />
            </label>

            <label className={styles.field}>
              <span>
                {t(
                  "initialPayment",
                )}
              </span>
              <input
                type="number"
                min={0}
                max={total}
                step="0.01"
                value={initialPayment}
                onChange={event =>
                  setInitialPayment(
                    Number(
                      event.target
                        .value,
                    ),
                  )
                }
              />
            </label>

            <label className={styles.field}>
              <span>
                {t(
                  "paymentMethod",
                )}
              </span>
              <input
                value={
                  paymentMethod
                }
                onChange={event =>
                  setPaymentMethod(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            {extra > 0 && (
              <label className={[
                styles.field,
                styles.fullWidth,
              ].join(" ")}>
                <span>
                  {t(
                    "extraReason",
                  )}
                </span>
                <input
                  required
                  value={
                    extraReason
                  }
                  onChange={event =>
                    setExtraReason(
                      event.target
                        .value,
                    )
                  }
                />
              </label>
            )}

            <label className={styles.field}>
              <span>
                {t(
                  "followUpDate",
                )}
              </span>
              <input
                type="datetime-local"
                value={
                  followUpLocal
                }
                onChange={event =>
                  setFollowUpLocal(
                    event.target
                      .value,
                  )
                }
              />
            </label>
          </div>

          <div className={styles.totals}>
            <div>
              <span>
                {t(
                  "subtotal",
                )}
              </span>
              <strong>
                {subtotal.toLocaleString()}
              </strong>
            </div>
            <div>
              <span>
                {t(
                  "discount",
                )}
              </span>
              <strong>
                -{discount.toLocaleString()}
              </strong>
            </div>
            <div>
              <span>
                {t(
                  "extraAmount",
                )}
              </span>
              <strong>
                +{extra.toLocaleString()}
              </strong>
            </div>
            <div className={styles.totalMain}>
              <span>
                {t("total")}
              </span>
              <strong>
                {total.toLocaleString()}
              </strong>
            </div>
            <div>
              <span>
                {t(
                  "remaining",
                )}
              </span>
              <strong>
                {Math.max(
                  0,
                  total
                  - initialPayment,
                ).toLocaleString()}
              </strong>
            </div>
          </div>

          <label className={styles.field}>
            <span>
              {t(
                "clinicalNotes",
              )}
            </span>
            <textarea
              rows={5}
              value={
                clinicalNotes
              }
              onChange={event =>
                setClinicalNotes(
                  event.target
                    .value,
                )
              }
            />
          </label>
        </section>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <footer className={styles.actions}>
          <Link
            className={styles.cancel}
            to={`/patients/${patientId}`}
          >
            {t("cancel")}
          </Link>

          <button
            type="submit"
            disabled={
              submitting
              || treatments.length
                === 0
              || !doctorId
            }
          >
            {submitting
              ? t("saving")
              : t("save")}
          </button>
        </footer>
      </form>
    </section>
  );
}
