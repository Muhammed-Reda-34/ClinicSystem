import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useLanguage } from "../../../i18n/LanguageContext";
import { getPatient } from "../../patients/api/patientsApi";
import { createPatientVisit } from "../api/visitsApi";
import {
  clearVisitDraft,
  loadVisitDraft,
  saveVisitDraft,
  type VisitDraft,
} from "../visitDraft";
import styles from "./VisitBillingPage.module.css";

export function VisitBillingPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const ar = language === "ar";

  const patientQuery = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatient(patientId!),
    enabled: Boolean(patientId),
  });

  const [draft, setDraft] = useState<VisitDraft | null>(
    () => patientId ? loadVisitDraft(patientId) : null,
  );

  const [discount, setDiscount] = useState(0);
  const [extra, setExtra] = useState(0);
  const [extraReason, setExtraReason] = useState("");
  const [initialPayment, setInitialPayment] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [followUpLocal, setFollowUpLocal] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const subtotal = useMemo(
    () =>
      draft?.treatments.reduce(
        (sum, item) => sum + item.unitPrice,
        0,
      ) ?? 0,
    [draft],
  );

  const total = Math.max(0, subtotal - discount + extra);
  const remaining = Math.max(0, total - initialPayment);

  function removeTreatment(index: number) {
    if (!draft || !patientId) return;

    const next: VisitDraft = {
      ...draft,
      treatments: draft.treatments.filter((_, itemIndex) => itemIndex !== index),
    };

    setDraft(next);

    if (next.treatments.length === 0) {
      clearVisitDraft(patientId);
    } else {
      saveVisitDraft(next);
    }
  }

  function treatmentStepUrl() {
    if (!patientId || !draft) return `/patients/${patientId}/visits/new`;

    const params = new URLSearchParams();
    params.set("doctorId", draft.doctorId);

    if (draft.appointmentId) {
      params.set("appointmentId", draft.appointmentId);
    }

    return `/patients/${patientId}/visits/new?${params.toString()}`;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (
      !patientId
      || !draft
      || draft.treatments.length === 0
      || !draft.doctorId
    ) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await createPatientVisit({
        patientId,
        doctorId: draft.doctorId,
        appointmentId: draft.appointmentId,
        visitDateUtc: new Date().toISOString(),
        clinicalNotes: clinicalNotes || null,
        discountAmount: discount,
        extraAmount: extra,
        extraReason: extraReason || null,
        followUpAtUtc: followUpLocal
          ? new Date(followUpLocal).toISOString()
          : null,
        treatments: draft.treatments.map(item => ({
          dentalServiceId: item.dentalServiceId,
          quantity: 1,
          toothNumbers: item.toothNumbers,
          notes: item.notes,
        })),
        initialPayment,
        paymentMethod: paymentMethod || null,
      });

      clearVisitDraft(patientId);
      navigate(`/patients/${patientId}`);
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        const message = (
          requestError.response?.data as { message?: string } | undefined
        )?.message;

        setError(
          message
          ?? (ar ? "تعذر حفظ الزيارة." : "Unable to save visit."),
        );
      } else {
        setError(ar ? "تعذر حفظ الزيارة." : "Unable to save visit.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (patientQuery.isLoading) {
    return <div className={styles.state}>{t("loading")}</div>;
  }

  if (!patientQuery.data) {
    return (
      <div className={styles.state}>
        {ar ? "تعذر تحميل بيانات المريض." : "Unable to load patient."}
      </div>
    );
  }

  if (!draft || draft.treatments.length === 0) {
    return (
      <section className={styles.emptyPage}>
        <div>
          <span>02</span>
          <h1>{ar ? "الحساب والمتابعة" : "Billing & follow-up"}</h1>
          <p>
            {ar
              ? "لا يوجد علاج مضاف للزيارة. ارجع واختر الخدمة أولًا."
              : "No treatment has been added. Go back and select a service first."}
          </p>
          <Link to={`/patients/${patientId}/visits/new`}>
            {ar ? "الرجوع لإضافة العلاج" : "Back to treatment"}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Clinical Visit • Step 02</p>
          <h1>{ar ? "الحساب والمتابعة" : "Billing & follow-up"}</h1>
          <p>
            {patientQuery.data.fullName}
            {" • "}
            {patientQuery.data.patientCode}
          </p>
        </div>

        <Link className={styles.back} to={treatmentStepUrl()}>
          {ar ? "الرجوع للعلاج" : "Back to treatment"}
        </Link>
      </header>

      <form className={styles.form} onSubmit={submit}>
        <section className={styles.card}>
          <div className={styles.sectionTitle}>
            <span>01</span>
            <div>
              <h2>{ar ? "العلاج المضاف" : "Selected treatment"}</h2>
              <p>
                {ar
                  ? "العلاج منفصل عن الحساب. يمكنك الرجوع لإضافة علاج آخر ثم العودة هنا."
                  : "Treatment is separate from billing. You can go back, add another treatment, then return here."}
              </p>
            </div>
          </div>

          <div className={styles.treatmentList}>
            {draft.treatments.map((item, index) => (
              <article key={`${item.dentalServiceId}-${index}`}>
                <div>
                  <strong>{item.serviceName}</strong>
                  <small>
                    {item.toothNumbers.length > 0
                      ? `${ar ? "الأسنان" : "Teeth"}: ${item.toothNumbers.join(", ")}`
                      : ar
                        ? "بدون سن محدد"
                        : "No specific tooth"}
                  </small>
                </div>

                <b>{item.unitPrice.toLocaleString()} EGP</b>

                <button
                  type="button"
                  onClick={() => removeTreatment(index)}
                  aria-label={ar ? "حذف العلاج" : "Remove treatment"}
                >
                  ×
                </button>
              </article>
            ))}
          </div>

          <Link className={styles.addAnother} to={treatmentStepUrl()}>
            {ar ? "+ إضافة علاج آخر" : "+ Add another treatment"}
          </Link>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionTitle}>
            <span>02</span>
            <div>
              <h2>{ar ? "الحساب والمتابعة" : "Billing & follow-up"}</h2>
              <p>
                {ar
                  ? "الخصم والإضافة والمدفوع والمتابعة والملاحظات فقط في هذه الصفحة."
                  : "Discount, extra amount, payment, follow-up and visit notes live on this page only."}
              </p>
            </div>
          </div>

          <div className={styles.financialGrid}>
            <label className={styles.field}>
              <span>{t("discount")}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={discount}
                onChange={event => setDiscount(Number(event.target.value))}
              />
            </label>

            <label className={styles.field}>
              <span>{t("extraAmount")}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={extra}
                onChange={event => setExtra(Number(event.target.value))}
              />
            </label>

            <label className={styles.field}>
              <span>{t("initialPayment")}</span>
              <input
                type="number"
                min={0}
                max={total}
                step="0.01"
                value={initialPayment}
                onChange={event => setInitialPayment(Number(event.target.value))}
              />
            </label>

            <label className={styles.field}>
              <span>{t("paymentMethod")}</span>
              <input
                value={paymentMethod}
                onChange={event => setPaymentMethod(event.target.value)}
              />
            </label>

            {extra > 0 && (
              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>{t("extraReason")}</span>
                <input
                  required
                  value={extraReason}
                  onChange={event => setExtraReason(event.target.value)}
                />
              </label>
            )}

            <label className={styles.field}>
              <span>{t("followUpDate")}</span>
              <input
                type="datetime-local"
                value={followUpLocal}
                onChange={event => setFollowUpLocal(event.target.value)}
              />
            </label>
          </div>

          <div className={styles.totals}>
            <div>
              <span>{t("subtotal")}</span>
              <strong>{subtotal.toLocaleString()}</strong>
            </div>
            <div>
              <span>{t("discount")}</span>
              <strong>-{discount.toLocaleString()}</strong>
            </div>
            <div>
              <span>{t("extraAmount")}</span>
              <strong>+{extra.toLocaleString()}</strong>
            </div>
            <div className={styles.totalMain}>
              <span>{t("total")}</span>
              <strong>{total.toLocaleString()}</strong>
            </div>
            <div>
              <span>{t("remaining")}</span>
              <strong>{remaining.toLocaleString()}</strong>
            </div>
          </div>

          <label className={styles.field}>
            <span>{t("clinicalNotes")}</span>
            <textarea
              rows={5}
              value={clinicalNotes}
              onChange={event => setClinicalNotes(event.target.value)}
            />
          </label>
        </section>

        {error && <div className={styles.error}>{error}</div>}

        <footer className={styles.actions}>
          <Link className={styles.cancel} to={`/patients/${patientId}`}>
            {t("cancel")}
          </Link>

          <button type="submit" disabled={submitting || draft.treatments.length === 0}>
            {submitting ? t("saving") : t("save")}
          </button>
        </footer>
      </form>
    </section>
  );
}
