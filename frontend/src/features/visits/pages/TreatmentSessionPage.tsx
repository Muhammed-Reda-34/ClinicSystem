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
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import { AppIcon } from "../../../components/icons/AppIcon";
import { useLanguage } from "../../../i18n/LanguageContext";
import { getPatient } from "../../patients/api/patientsApi";
import {
  createTreatmentSession,
  getPatientVisits,
} from "../api/visitsApi";
import styles from "./TreatmentSessionPage.module.css";
import { SimpleDateInput } from "../../../components/forms/SimpleDateInput";

export function TreatmentSessionPage() {
  const { patientId, treatmentItemId } = useParams();
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

  const source = useMemo(() => {
    for (const visit of visitsQuery.data ?? []) {
      const treatment = visit.treatments.find(item => item.id === treatmentItemId);
      if (treatment) return { visit, treatment };
    }
    return null;
  }, [visitsQuery.data, treatmentItemId]);

  const caseSessions = useMemo(() => {
    if (!source) return [];

    return (visitsQuery.data ?? [])
      .flatMap(visit => visit.treatments
        .filter(item => item.treatmentCaseId === source.treatment.treatmentCaseId)
        .map(item => ({ visit, treatment: item })))
      .sort((a, b) => a.treatment.sessionNumber - b.treatment.sessionNumber);
  }, [visitsQuery.data, source]);

  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sessionNotes, setSessionNotes] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [followUpMonths, setFollowUpMonths] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [completesCase, setCompletesCase] = useState(false);
  const [error, setError] = useState("");

  function changeFollowUpMonths(value: string, baseDate = visitDate) {
    setFollowUpMonths(value);
    if (!value) {
      setFollowUpDate("");
      return;
    }

    const date = new Date(`${baseDate}T12:00:00`);
    date.setMonth(date.getMonth() + Number(value));
    setFollowUpDate(date.toISOString().slice(0, 10));
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!treatmentItemId) return;

      const selected = new Date(`${visitDate}T00:00:00`);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      await createTreatmentSession(treatmentItemId, {
        visitDateUtc: new Date(`${visitDate}T12:00:00`).toISOString(),
        sessionNotes: sessionNotes.trim() || null,
        clinicalNotes: clinicalNotes.trim() || null,
        followUpAtUtc: followUpDate
          ? new Date(`${followUpDate}T12:00:00`).toISOString()
          : null,
        completesTreatmentCase: completesCase,
        isHistoricalEntry: selected < monthStart,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["patient-visits", patientId] }),
        client.invalidateQueries({ queryKey: ["dashboard"] }),
        client.invalidateQueries({ queryKey: ["visit-follow-ups"] }),
      ]);
      navigate(`/patients/${patientId}`);
    },
    onError: requestError => {
      if (axios.isAxiosError(requestError)) {
        const message = (
          requestError.response?.data as { message?: string } | undefined
        )?.message;
        setError(message ?? (ar ? "تعذر تسجيل جلسة العلاج." : "Unable to create treatment session."));
      } else {
        setError(ar ? "تعذر تسجيل جلسة العلاج." : "Unable to create treatment session.");
      }
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!visitDate || !source?.treatment.isLatestSession) {
      setError(ar ? "لا يمكن إنشاء الجلسة من سجل قديم للعلاج." : "A session can only continue from the latest treatment session.");
      return;
    }
    mutation.mutate();
  }

  if (patientQuery.isLoading || visitsQuery.isLoading) {
    return <div className={styles.state}>{ar ? "جارِ التحميل..." : "Loading..."}</div>;
  }

  if (!patientQuery.data || !source) {
    return <div className={styles.state}>{ar ? "العلاج غير موجود." : "Treatment not found."}</div>;
  }

  const name = ar
    ? source.treatment.serviceNameAr
    : source.treatment.serviceNameEn || source.treatment.serviceNameAr;

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroIcon}><AppIcon name="followUp" /></div>
        <div>
          <p>{ar ? "متابعة علاج متعدد الجلسات" : "Multi-session treatment follow-up"}</p>
          <h1>{name}</h1>
          <span>
            {patientQuery.data.fullName} • {ar ? "الأسنان" : "Teeth"}: {source.treatment.toothNumbers.join(" • ") || "—"}
          </span>
        </div>
        <Link to={`/patients/${patientId}`}>{ar ? "رجوع" : "Back"}</Link>
      </header>

      <div className={styles.caseStrip}>
        <div>
          <span>{ar ? "الجلسة الحالية" : "Current session"}</span>
          <strong>{source.treatment.sessionNumber}</strong>
        </div>
        <div>
          <span>{ar ? "إجمالي الجلسات المسجلة" : "Recorded sessions"}</span>
          <strong>{source.treatment.caseSessionCount}</strong>
        </div>
        <div>
          <span>{ar ? "حالة العلاج" : "Treatment status"}</span>
          <strong className={source.treatment.caseCompleted ? styles.done : styles.open}>
            {source.treatment.caseCompleted
              ? (ar ? "مكتمل" : "Completed")
              : (ar ? "قيد العلاج" : "In progress")}
          </strong>
        </div>
      </div>

      <section className={styles.historyCard}>
        <h2>{ar ? "سجل جلسات العلاج" : "Treatment session history"}</h2>
        <div className={styles.timeline}>
          {caseSessions.map(({ visit, treatment }) => (
            <article key={treatment.id}>
              <b>{ar ? `جلسة ${treatment.sessionNumber}` : `Session ${treatment.sessionNumber}`}</b>
              <span>{new Date(visit.visitDateUtc).toLocaleDateString(ar ? "ar-EG" : "en-GB")}</span>
              <small>{treatment.notes || (ar ? "بدون ملاحظات" : "No notes")}</small>
            </article>
          ))}
        </div>
      </section>

      <form className={styles.form} onSubmit={submit}>
        <section className={styles.card}>
          <div className={styles.titleRow}>
            <AppIcon name="tooth" />
            <div>
              <h2>{ar ? `تسجيل الجلسة رقم ${source.treatment.sessionNumber + 1}` : `Record session ${source.treatment.sessionNumber + 1}`}</h2>
              <p>{ar ? "الجلسة مرتبطة بنفس العلاج والأسنان تلقائيًا، ولا يتم احتساب سعر العلاج بالكامل مرة ثانية." : "This session stays linked to the same treatment and teeth without charging the full treatment price again."}</p>
            </div>
          </div>

          <div className={styles.grid}>
            <label>
              <span>{ar ? "تاريخ الجلسة" : "Session date"}</span>
              <SimpleDateInput
                value={visitDate}
                required
                onChange={nextDate => {
                  setVisitDate(nextDate);
                  if (followUpMonths) changeFollowUpMonths(followUpMonths, nextDate);
                }}
              />
            </label>
            <label>
              <span>{ar ? "المتابعة بعد" : "Follow-up after"}</span>
              <select value={followUpMonths} onChange={e => changeFollowUpMonths(e.target.value)}>
                <option value="">{ar ? "بدون متابعة تلقائية" : "No automatic follow-up"}</option>
                <option value="1">{ar ? "شهر" : "1 month"}</option>
                <option value="2">{ar ? "شهرين" : "2 months"}</option>
                <option value="3">{ar ? "3 أشهر" : "3 months"}</option>
                <option value="4">{ar ? "4 أشهر" : "4 months"}</option>
                <option value="5">{ar ? "5 أشهر" : "5 months"}</option>
                <option value="6">{ar ? "6 أشهر" : "6 months"}</option>
              </select>
            </label>
          </div>

          {followUpDate && (
            <div className={styles.followUpHint}>
              {ar ? "موعد المتابعة المحسوب" : "Calculated follow-up"}: <strong>{followUpDate}</strong>
            </div>
          )}

          <label className={styles.fullField}>
            <span>{ar ? "تفاصيل الجلسة" : "Session notes"}</span>
            <textarea rows={4} value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} placeholder={ar ? "ما تم في الجلسة، الخطوات، حالة السن..." : "What was done in this session..."} />
          </label>

          <label className={styles.fullField}>
            <span>{ar ? "ملاحظة عامة للطبيب" : "Doctor note"}</span>
            <textarea rows={3} value={clinicalNotes} onChange={e => setClinicalNotes(e.target.value)} />
          </label>

          <label className={styles.completeToggle}>
            <input type="checkbox" checked={completesCase} onChange={e => setCompletesCase(e.target.checked)} />
            <span>
              <strong>{ar ? "هذه الجلسة تُنهي العلاج" : "This session completes the treatment"}</strong>
              <small>{ar ? "لو مش آخر جلسة سيبها غير محددة، وسيظهر زر متابعة العلاج مرة أخرى في البروفايل." : "Leave unchecked if more sessions are needed."}</small>
            </span>
          </label>
        </section>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.submit} type="submit" disabled={mutation.isPending || !source.treatment.isLatestSession}>
          <AppIcon name="plus" />
          {mutation.isPending
            ? (ar ? "جارِ التسجيل..." : "Saving...")
            : (ar ? "تسجيل جلسة المتابعة" : "Record treatment session")}
        </button>
      </form>
    </section>
  );
}
