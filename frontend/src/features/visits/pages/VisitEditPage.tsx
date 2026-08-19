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
  useNavigate,
  useParams,
} from "react-router-dom";
import { AppIcon } from "../../../components/icons/AppIcon";
import { useLanguage } from "../../../i18n/LanguageContext";
import { getPatient } from "../../patients/api/patientsApi";
import { getDentalServices } from "../../services/api/servicesApi";
import { DentalChart } from "../components/DentalChart";
import {
  getPatientVisits,
  updatePatientVisit,
} from "../api/visitsApi";
import type { UpdateVisitTreatment } from "../../../types/clinical";
import styles from "./VisitEditPage.module.css";
import { SimpleDateInput } from "../../../components/forms/SimpleDateInput";
import { ClinicPageHeader } from "../../../components/ui/ClinicPageHeader";
import { composeVisitClinicalNote, parseVisitClinicalNote } from "../clinicalNoteCodec";

type EditableTreatment = UpdateVisitTreatment & {
  serviceName: string;
  unitPrice: number;
};

function dateOnly(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function VisitEditPage() {
  const { patientId, visitId } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { language } = useLanguage();
  const ar = language === "ar";

  const patientQuery = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatient(patientId!),
    enabled: Boolean(patientId),
  });

  const visitsQuery = useQuery({
    queryKey: ["patient-visits", patientId],
    queryFn: () => getPatientVisits(patientId!),
    enabled: Boolean(patientId),
  });

  const servicesQuery = useQuery({
    queryKey: ["dental-services", "active"],
    queryFn: () => getDentalServices(false),
  });

  const visit = visitsQuery.data?.find(item => item.id === visitId) ?? null;

  const [initialized, setInitialized] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [imagingReference, setImagingReference] = useState("");
  const [discount, setDiscount] = useState("");
  const [extra, setExtra] = useState("");
  const [extraReason, setExtraReason] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [treatments, setTreatments] = useState<EditableTreatment[]>([]);
  const [activeTreatmentIndex, setActiveTreatmentIndex] = useState<number | null>(null);
  const [newServiceId, setNewServiceId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visit || initialized) return;

    setVisitDate(dateOnly(visit.visitDateUtc));
    const parsedClinical = parseVisitClinicalNote(visit.clinicalNotes);
    setClinicalNotes(parsedClinical.doctorNote);
    setImagingReference(parsedClinical.imagingReference);
    setDiscount(visit.discountAmount ? String(visit.discountAmount) : "");
    setExtra(visit.extraAmount ? String(visit.extraAmount) : "");
    setExtraReason(visit.extraReason ?? "");
    setFollowUpDate(visit.followUpAtUtc ? dateOnly(visit.followUpAtUtc) : "");
    setTreatments(
      visit.treatments.map(item => ({
        treatmentItemId: item.id,
        dentalServiceId: item.dentalServiceId ?? "",
        quantity: item.quantity,
        toothNumbers: [...item.toothNumbers],
        notes: item.notes,
        completesTreatmentCase: item.completesTreatmentCase,
        serviceName: ar
          ? item.serviceNameAr
          : item.serviceNameEn || item.serviceNameAr,
        unitPrice: item.unitPrice,
      })),
    );
    setInitialized(true);
  }, [visit, initialized, ar]);

  const services = servicesQuery.data ?? [];

  const totalPreview = useMemo(() => {
    const subtotal = treatments.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    return Math.max(0, subtotal - Number(discount || 0) + Number(extra || 0));
  }, [treatments, discount, extra]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!visitId || !visitDate || treatments.length === 0) return;

      await updatePatientVisit(visitId, {
        visitDateUtc: new Date(`${visitDate}T12:00:00`).toISOString(),
        clinicalNotes: composeVisitClinicalNote(clinicalNotes, imagingReference),
        discountAmount: Number(discount || 0),
        extraAmount: Number(extra || 0),
        extraReason: extraReason.trim() || null,
        followUpAtUtc: followUpDate
          ? new Date(`${followUpDate}T12:00:00`).toISOString()
          : null,
        treatments: treatments.map(item => ({
          treatmentItemId: item.treatmentItemId ?? null,
          dentalServiceId: item.dentalServiceId,
          quantity: item.quantity,
          toothNumbers: item.toothNumbers,
          notes: item.notes || null,
          completesTreatmentCase: item.completesTreatmentCase,
        })),
        isHistoricalEntry: (() => {
          const selected = new Date(`${visitDate}T00:00:00`);
          const now = new Date();
          const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          return selected < currentMonthStart;
        })(),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["patient-visits", patientId] }),
        client.invalidateQueries({ queryKey: ["visit-debts"] }),
        client.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      navigate(`/patients/${patientId}`);
    },
    onError: requestError => {
      if (axios.isAxiosError(requestError)) {
        const message = (
          requestError.response?.data as { message?: string } | undefined
        )?.message;
        setError(message ?? (ar ? "تعذر تعديل الزيارة." : "Unable to update visit."));
      } else {
        setError(ar ? "تعذر تعديل الزيارة." : "Unable to update visit.");
      }
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!visitDate || treatments.length === 0 || treatments.some(item => !item.dentalServiceId)) {
      setError(ar ? "راجع تاريخ الزيارة والعلاجات." : "Review the visit date and treatments.");
      return;
    }

    if (totalPreview < (visit?.paid ?? 0)) {
      setError(
        ar
          ? `إجمالي الزيارة بعد التعديل لا يمكن أن يقل عن المدفوع (${visit?.paid.toLocaleString()} EGP).`
          : "The edited visit total cannot be lower than the amount already paid.",
      );
      return;
    }

    mutation.mutate();
  }

  function updateTreatment(index: number, patch: Partial<EditableTreatment>) {
    setTreatments(current => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item,
    ));
  }

  function changeService(index: number, serviceId: string) {
    const service = services.find(item => item.id === serviceId);
    if (!service) return;

    updateTreatment(index, {
      dentalServiceId: service.id,
      serviceName: ar ? service.nameAr : service.nameEn || service.nameAr,
      unitPrice: service.currentPrice,
    });
  }

  function addTreatment() {
    const service = services.find(item => item.id === newServiceId);
    if (!service) return;

    setTreatments(current => [
      ...current,
      {
        treatmentItemId: null,
        dentalServiceId: service.id,
        quantity: 1,
        toothNumbers: [],
        notes: null,
        completesTreatmentCase: true,
        serviceName: ar ? service.nameAr : service.nameEn || service.nameAr,
        unitPrice: service.currentPrice,
      },
    ]);
    setNewServiceId("");
    setActiveTreatmentIndex(treatments.length);
  }

  if (patientQuery.isLoading || visitsQuery.isLoading || servicesQuery.isLoading) {
    return <div className={styles.state}>{ar ? "جارِ التحميل..." : "Loading..."}</div>;
  }

  if (!patientQuery.data || !visit) {
    return <div className={styles.state}>{ar ? "الزيارة غير موجودة." : "Visit not found."}</div>;
  }

  return (
    <section className={styles.page}>
      <ClinicPageHeader
        eyebrow="Clinical Visit • Edit"
        title={ar ? "تعديل الزيارة" : "Edit visit"}
        subtitle={`${patientQuery.data.fullName} • ${patientQuery.data.patientCode} • ${visit.doctorName}`}
        icon="edit"
        actions={
          <Link className={styles.headerLink} to={`/patients/${patientId}`}>
            {ar ? "رجوع للبروفايل" : "Back to profile"}
          </Link>
        }
        metrics={[
          {
            label: ar ? "العلاجات" : "Treatments",
            value: treatments.length,
            icon: "services",
            tone: "primary",
          },
          {
            label: ar ? "إجمالي الزيارة" : "Visit total",
            value: `${totalPreview.toLocaleString()} EGP`,
            icon: "debt",
            tone: "success",
          },
          {
            label: ar ? "المدفوع" : "Paid",
            value: `${visit.paid.toLocaleString()} EGP`,
            icon: "reports",
            tone: "neutral",
          },
          {
            label: ar ? "المتابعة" : "Follow-up",
            value: followUpDate || (ar ? "بدون" : "None"),
            icon: "followUp",
            tone: followUpDate ? "warning" : "neutral",
          },
        ]}
      />

      <form onSubmit={submit} className={styles.form}>
        <section className={styles.card}>
          <div className={styles.sectionTitle}>
            <AppIcon name="calendar" />
            <div>
              <h2>{ar ? "بيانات الزيارة" : "Visit details"}</h2>
              <p>{ar ? "التعديل هنا لا يمس الدفعات المسجلة، وتظل كل التغييرات محفوظة في الـ Audit." : "Payments are preserved and changes remain auditable."}</p>
            </div>
          </div>

          <div className={styles.grid}>
            <label>
              <span>{ar ? "تاريخ الزيارة" : "Visit date"}</span>
              <SimpleDateInput value={visitDate} onChange={setVisitDate} required />
            </label>
            <label>
              <span>{ar ? "موعد المتابعة" : "Follow-up date"}</span>
              <SimpleDateInput value={followUpDate} onChange={setFollowUpDate} />
            </label>
            <label>
              <span>{ar ? "الخصم" : "Discount"}</span>
              <input type="number" min="0" step="0.01" value={discount} placeholder="0" onChange={e => setDiscount(e.target.value)} />
            </label>
            <label>
              <span>{ar ? "إضافة على الحساب" : "Extra charge"}</span>
              <input type="number" min="0" step="0.01" value={extra} placeholder="0" onChange={e => setExtra(e.target.value)} />
            </label>
          </div>

          {Number(extra || 0) > 0 && (
            <label className={styles.fullField}>
              <span>{ar ? "سبب الإضافة" : "Extra reason"}</span>
              <input value={extraReason} onChange={e => setExtraReason(e.target.value)} />
            </label>
          )}

          <label className={styles.fullField}>
            <span>{ar ? "ملاحظة الطبيب" : "Doctor note"}</span>
            <textarea rows={4} value={clinicalNotes} onChange={e => setClinicalNotes(e.target.value)} />
          </label>

          <label className={styles.fullField}>
            <span>{ar ? "رقم الأشعة / الصورة" : "X-ray / image reference"}</span>
            <input
              value={imagingReference}
              placeholder={ar ? "مثال: XR-123212" : "Example: XR-123212"}
              onChange={e => setImagingReference(e.target.value)}
            />
            <small className={styles.helperText}>
              {ar
                ? "رقم يدوي يرجع له الطبيب سريعًا للوصول إلى الأشعة أو الصورة داخل جهازه."
                : "Manual reference used by the doctor to quickly locate the scan or image later."}
            </small>
          </label>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionTitle}>
            <AppIcon name="tooth" />
            <div>
              <h2>{ar ? "العلاجات" : "Treatments"}</h2>
              <p>{ar ? "تقدر تعدل الخدمة أو الأسنان أو الملاحظات. العلاج المرتبط بجلسات لاحقة محمي من الحذف بالخطأ." : "Edit service, teeth and notes. Treatments linked to later sessions are protected from accidental removal."}</p>
            </div>
          </div>

          <div className={styles.treatmentList}>
            {treatments.map((item, index) => (
              <article key={item.treatmentItemId ?? `new-${index}`} className={styles.treatmentCard}>
                <div className={styles.treatmentTop}>
                  <select value={item.dentalServiceId} onChange={e => changeService(index, e.target.value)}>
                    {services.map(service => (
                      <option key={service.id} value={service.id}>
                        {ar ? service.nameAr : service.nameEn || service.nameAr}
                      </option>
                    ))}
                  </select>
                  <strong>{item.unitPrice.toLocaleString()} EGP</strong>
                </div>

                <div className={styles.treatmentMeta}>
                  <span>{ar ? "الأسنان" : "Teeth"}: {item.toothNumbers.join(" • ") || (ar ? "غير محدد" : "None")}</span>
                  <button type="button" onClick={() => setActiveTreatmentIndex(activeTreatmentIndex === index ? null : index)}>
                    {ar ? "تعديل الأسنان" : "Edit teeth"}
                  </button>
                </div>

                {activeTreatmentIndex === index && (
                  <div className={styles.chartWrap}>
                    <DentalChart
                      selectedTeeth={item.toothNumbers}
                      onChange={value => updateTreatment(index, { toothNumbers: value })}
                    />
                  </div>
                )}

                <textarea
                  rows={2}
                  value={item.notes ?? ""}
                  placeholder={ar ? "ملاحظة العلاج" : "Treatment note"}
                  onChange={e => updateTreatment(index, { notes: e.target.value || null })}
                />

                <label className={styles.sessionCheck}>
                  <input
                    type="checkbox"
                    checked={!item.completesTreatmentCase}
                    onChange={e => updateTreatment(index, { completesTreatmentCase: !e.target.checked })}
                  />
                  <span>{ar ? "العلاج يحتاج جلسة أخرى" : "Treatment needs another session"}</span>
                </label>

                {treatments.length > 1 && (
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => {
                      setTreatments(current => current.filter((_, itemIndex) => itemIndex !== index));
                      setActiveTreatmentIndex(null);
                    }}
                  >
                    {ar ? "حذف العلاج من الزيارة" : "Remove treatment"}
                  </button>
                )}
              </article>
            ))}
          </div>

          <div className={styles.addRow}>
            <select value={newServiceId} onChange={e => setNewServiceId(e.target.value)}>
              <option value="">{ar ? "إضافة علاج جديد..." : "Add treatment..."}</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  {ar ? service.nameAr : service.nameEn || service.nameAr}
                </option>
              ))}
            </select>
            <button type="button" onClick={addTreatment} disabled={!newServiceId}>
              <AppIcon name="plus" />
              {ar ? "إضافة" : "Add"}
            </button>
          </div>
        </section>

        <section className={styles.summary}>
          <div>
            <span>{ar ? "الإجمالي بعد التعديل" : "Edited total"}</span>
            <strong>{totalPreview.toLocaleString()} EGP</strong>
            <small>{ar ? `المدفوع المسجل: ${visit.paid.toLocaleString()} EGP` : `Recorded payments: ${visit.paid.toLocaleString()} EGP`}</small>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" disabled={mutation.isPending}>
            <AppIcon name="edit" />
            {mutation.isPending
              ? (ar ? "جارِ الحفظ..." : "Saving...")
              : (ar ? "حفظ تعديل الزيارة" : "Save visit changes")}
          </button>
        </section>
      </form>
    </section>
  );
}
