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

  const [discountInput, setDiscountInput] = useState("");
  const [extraInput, setExtraInput] = useState("");
  const [extraReason, setExtraReason] = useState("");
  const [initialPaymentInput, setInitialPaymentInput] = useState(
    () => draft?.hasDeposit && draft.depositAmount
      ? String(draft.depositAmount)
      : "",
  );
  const [paymentMethod, setPaymentMethod] = useState(
    () => draft?.depositPaymentMethod ?? "",
  );
  const [followUpLocal, setFollowUpLocal] = useState("");
  const [followUpMonths, setFollowUpMonths] = useState("");
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [clinicalNotes, setClinicalNotes] = useState(
    () => draft?.clinicalNotes ?? "",
  );
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

  const discount = Number(discountInput || 0);
  const extra = Number(extraInput || 0);
  const initialPayment = Number(initialPaymentInput || 0);
  const total = Math.max(0, subtotal - discount + extra);
  const remaining = Math.max(0, total - initialPayment);
  const depositApplied = Boolean(draft?.hasDeposit && initialPayment > 0);

  function applyFollowUpMonths(value: string) {
    setFollowUpMonths(value);
    if (!value) {
      setFollowUpLocal("");
      return;
    }

    const months = Number(value);
    const base = visitDate ? new Date(`${visitDate}T12:00:00`) : new Date();
    base.setMonth(base.getMonth() + months);
    setFollowUpLocal(base.toISOString().slice(0, 10));
  }

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

    if (initialPayment > 0 && !paymentMethod) {
      setError(ar ? "اختر طريقة الدفع." : "Select a payment method.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await createPatientVisit({
        patientId,
        doctorId: draft.doctorId,
        appointmentId: draft.appointmentId,
        visitDateUtc: new Date(`${visitDate}T12:00:00`).toISOString(),
        clinicalNotes: clinicalNotes || null,
        discountAmount: discount,
        extraAmount: extra,
        extraReason: extraReason || null,
        followUpAtUtc: followUpLocal
          ? new Date(`${followUpLocal}T12:00:00`).toISOString()
          : null,
        treatments: draft.treatments.map(item => ({
          dentalServiceId: item.dentalServiceId,
          quantity: 1,
          toothNumbers: item.toothNumbers,
          notes: item.notes,
        })),
        initialPayment,
        paymentMethod: paymentMethod || null,
        initialPaymentNotes: depositApplied ? "Deposit" : null,
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
              ? "لا يوجد كشف أو علاج مضاف للزيارة. ارجع واختر البنود أولًا."
              : "No consultation or treatment has been added. Go back and select visit items first."}
          </p>
          <Link to={`/patients/${patientId}/visits/new`}>
            {ar ? "الرجوع لخطة الزيارة" : "Back to visit plan"}
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
          {ar ? "تعديل خطة الزيارة" : "Edit visit plan"}
        </Link>
      </header>

      <form className={styles.form} onSubmit={submit}>
        <section className={styles.card}>
          <div className={styles.sectionTitle}>
            <span>01</span>
            <div>
              <h2>{ar ? "ملخص الزيارة" : "Visit summary"}</h2>
              <p>
                {ar
                  ? "كل الكشف والعلاجات التي اخترتها في الشاشة السابقة موجودة هنا مرة واحدة."
                  : "All consultation and treatment items selected on the previous screen are summarized here."}
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
                  {item.notes && (
                    <small className={styles.itemNote}>
                      {item.notes}
                    </small>
                  )}
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
            {ar ? "تعديل / إضافة علاج" : "Edit / add treatment"}
          </Link>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionTitle}>
            <span>02</span>
            <div>
              <h2>{ar ? "الحساب والمتابعة" : "Billing & follow-up"}</h2>
              <p>
                {ar
                  ? "التاريخ والمدفوع والمتابعة هنا، مع الاحتفاظ بملاحظات الطبيب من الشاشة السابقة."
                  : "Visit date, payment and follow-up live here while preserving the doctor's notes from the previous step."}
              </p>
            </div>
          </div>

          {draft.hasDeposit && (
            <div className={styles.depositNotice}>
              <div>
                <strong>{ar ? "ديبوزيت مسجل" : "Deposit recorded"}</strong>
                <span>
                  {ar
                    ? "تم تحميل قيمة الديبوزيت تلقائيًا كدفعة أولى ويمكن مراجعتها قبل الحفظ."
                    : "The deposit was loaded automatically as the initial payment and can be reviewed before saving."}
                </span>
              </div>
              <b>{initialPayment.toLocaleString()} EGP</b>
            </div>
          )}

          <div className={styles.financialGrid}>
            <label className={styles.field}>
              <span>{t("discount")}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={discountInput}
                placeholder={ar ? "الخصم" : "Discount"}
                onChange={event => setDiscountInput(event.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span>{t("extraAmount")}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={extraInput}
                placeholder={ar ? "إضافة" : "Extra amount"}
                onChange={event => setExtraInput(event.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span>
                {draft.hasDeposit
                  ? ar ? "الديبوزيت / الدفعة الأولى" : "Deposit / initial payment"
                  : t("initialPayment")}
              </span>
              <input
                type="number"
                min={0}
                max={total}
                step="0.01"
                value={initialPaymentInput}
                placeholder={ar ? "اكتب المبلغ المدفوع" : "Enter paid amount"}
                onChange={event => setInitialPaymentInput(event.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span>{t("paymentMethod")}</span>
              <select
                value={paymentMethod}
                onChange={event => setPaymentMethod(event.target.value)}
              >
                <option value="">{ar ? "اختر طريقة الدفع" : "Select payment method"}</option>
                <option value="Cash">{ar ? "كاش" : "Cash"}</option>
                <option value="InstaPay">InstaPay</option>
                <option value="Vodafone Cash">Vodafone Cash</option>
              </select>
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
              <span>{ar ? "تاريخ الزيارة" : "Visit date"}</span>
              <input
                type="date"
                value={visitDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={event => {
                  setVisitDate(event.target.value);
                  if (followUpMonths) applyFollowUpMonths(followUpMonths);
                }}
              />
            </label>

            <label className={styles.field}>
              <span>{ar ? "موعد المتابعة" : "Follow-up after"}</span>
              <select
                value={followUpMonths}
                onChange={event => applyFollowUpMonths(event.target.value)}
              >
                <option value="">{ar ? "بدون متابعة" : "No follow-up"}</option>
                <option value="1">{ar ? "شهر" : "1 month"}</option>
                <option value="2">{ar ? "شهرين" : "2 months"}</option>
                <option value="3">{ar ? "3 أشهر" : "3 months"}</option>
                <option value="4">{ar ? "4 أشهر" : "4 months"}</option>
                <option value="5">{ar ? "5 أشهر" : "5 months"}</option>
                <option value="6">{ar ? "6 أشهر" : "6 months"}</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>{t("followUpDate")}</span>
              <input
                type="date"
                value={followUpLocal}
                onChange={event => {
                  setFollowUpMonths("");
                  setFollowUpLocal(event.target.value);
                }}
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
            <span>{ar ? "ملاحظة / تذكرة الطبيب" : "Doctor note / reminder"}</span>
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
