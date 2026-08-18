import {
  useMemo,
  useState,
} from "react";
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
  AppIcon,
} from "../../../components/icons/AppIcon";
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
import {
  DentalChart,
} from "../components/DentalChart";
import {
  loadVisitDraft,
  saveVisitDraft,
  type VisitDraft,
  type VisitDraftTreatment,
} from "../visitDraft";
import styles from "./VisitCreatePage.module.css";

function isConsultationService(service: {
  nameAr: string;
  nameEn: string | null;
}) {
  const ar = service.nameAr.trim();
  const en = (service.nameEn ?? "").trim().toLowerCase();

  return ar === "كشف"
    || en === "consultation"
    || en === "examination";
}

export function VisitCreatePage() {
  const { patientId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { doctors, selectedDoctor } = useDoctorContext();
  const ar = language === "ar";

  const appointmentId = searchParams.get("appointmentId");
  const doctorFromQuery = searchParams.get("doctorId");

  const patientQuery = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatient(patientId!),
    enabled: Boolean(patientId),
  });

  const servicesQuery = useQuery({
    queryKey: ["dental-services", "active"],
    queryFn: () => getDentalServices(false),
  });

  const initialDraft = patientId ? loadVisitDraft(patientId) : null;

  const [doctorId, setDoctorId] = useState(
    doctorFromQuery
    ?? initialDraft?.doctorId
    ?? selectedDoctor?.doctorId
    ?? "",
  );

  const [treatments, setTreatments] = useState<VisitDraftTreatment[]>(
    initialDraft?.treatments ?? [],
  );
  const [clinicalNotes, setClinicalNotes] = useState(
    initialDraft?.clinicalNotes ?? "",
  );
  const [hasDeposit, setHasDeposit] = useState(
    initialDraft?.hasDeposit ?? false,
  );
  const [depositAmount, setDepositAmount] = useState(
    initialDraft?.depositAmount
      ? String(initialDraft.depositAmount)
      : "",
  );
  const [depositPaymentMethod, setDepositPaymentMethod] = useState(
    initialDraft?.depositPaymentMethod ?? "",
  );

  const [selectedCategory, setSelectedCategory] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [treatmentNotes, setTreatmentNotes] = useState("");

  const consultationService = useMemo(
    () => (servicesQuery.data ?? []).find(isConsultationService) ?? null,
    [servicesQuery.data],
  );

  const consultationTreatment = consultationService
    ? treatments.find(item => item.dentalServiceId === consultationService.id) ?? null
    : null;

  const [examinationFindings, setExaminationFindings] = useState(() => {
    const draftConsultation = initialDraft?.treatments.find(item => {
      const name = item.serviceName.trim().toLowerCase();
      return item.serviceName.trim() === "كشف"
        || name === "consultation"
        || name === "examination";
    });

    return draftConsultation?.notes ?? "";
  });

  const serviceGroups = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<typeof servicesQuery.data>
    >();

    for (const service of servicesQuery.data ?? []) {
      if (isConsultationService(service)) continue;

      const list = map.get(service.category) ?? [];
      list.push(service);
      map.set(service.category, list);
    }

    return Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b, ar ? "ar" : "en"),
    );
  }, [servicesQuery.data, ar]);

  const activeCategory =
    selectedCategory || serviceGroups[0]?.[0] || "";

  const visibleServices =
    serviceGroups.find(([category]) => category === activeCategory)?.[1]
    ?? [];

  const selectedService = servicesQuery.data?.find(
    service => service.id === serviceId,
  ) ?? null;

  const normalizedTreatments = useMemo(
    () => treatments.map(item => {
      if (
        consultationService
        && item.dentalServiceId === consultationService.id
      ) {
        return {
          ...item,
          notes: examinationFindings.trim() || null,
        };
      }

      return item;
    }),
    [treatments, consultationService, examinationFindings],
  );

  function buildDraft(nextTreatments = normalizedTreatments): VisitDraft | null {
    if (!patientId || !doctorId) return null;

    return {
      patientId,
      doctorId,
      appointmentId: appointmentId || null,
      treatments: nextTreatments,
      clinicalNotes: clinicalNotes.trim() || null,
      hasDeposit,
      depositAmount: hasDeposit ? Number(depositAmount || 0) : 0,
      depositPaymentMethod:
        hasDeposit && depositAmount
          ? depositPaymentMethod || null
          : null,
    };
  }

  function persist(nextTreatments = normalizedTreatments) {
    const draft = buildDraft(nextTreatments);
    if (draft) saveVisitDraft(draft);
  }

  function toggleConsultation() {
    if (!consultationService) return;

    const exists = treatments.some(
      item => item.dentalServiceId === consultationService.id,
    );

    const next = exists
      ? treatments.filter(item => item.dentalServiceId !== consultationService.id)
      : [
          {
            dentalServiceId: consultationService.id,
            quantity: 1,
            toothNumbers: [],
            notes: examinationFindings.trim() || null,
            serviceName:
              ar
                ? consultationService.nameAr
                : consultationService.nameEn || consultationService.nameAr,
            unitPrice: consultationService.currentPrice,
          },
          ...treatments,
        ];

    setTreatments(next);
    persist(next);
  }

  function addTreatment() {
    if (!selectedService || !doctorId) return;

    const next: VisitDraftTreatment[] = [
      ...normalizedTreatments,
      {
        dentalServiceId: selectedService.id,
        quantity: 1,
        toothNumbers: selectedTeeth,
        notes: treatmentNotes.trim() || null,
        serviceName:
          ar
            ? selectedService.nameAr
            : selectedService.nameEn || selectedService.nameAr,
        unitPrice: selectedService.currentPrice,
      },
    ];

    setTreatments(next);
    setServiceId("");
    setSelectedTeeth([]);
    setTreatmentNotes("");
    persist(next);
  }

  function removeTreatment(index: number) {
    const next = normalizedTreatments.filter((_, itemIndex) => itemIndex !== index);
    setTreatments(next);
    persist(next);
  }

  function continueToBilling() {
    if (!patientId || !doctorId || normalizedTreatments.length === 0) return;

    if (
      hasDeposit
      && Number(depositAmount || 0) > 0
      && !depositPaymentMethod
    ) {
      return;
    }

    const draft = buildDraft();
    if (!draft) return;

    saveVisitDraft(draft);
    navigate(`/patients/${patientId}/visits/new/billing`);
  }

  if (patientQuery.isLoading || servicesQuery.isLoading) {
    return <div className={styles.state}>{t("loading")}</div>;
  }

  if (!patientQuery.data || servicesQuery.isError) {
    return (
      <div className={styles.state}>
        {ar ? "تعذر تجهيز الزيارة." : "Unable to prepare visit."}
      </div>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Clinical Visit • Step 01</p>
          <h1>{t("newVisit")}</h1>
          <p>
            {patientQuery.data.fullName}
            {" • "}
            {patientQuery.data.patientCode}
          </p>
        </div>

        <div className={styles.headerActions}>
          {normalizedTreatments.length > 0 && (
            <button
              type="button"
              className={styles.draftButton}
              onClick={continueToBilling}
            >
              {ar
                ? `الحساب والمتابعة (${normalizedTreatments.length})`
                : `Billing & follow-up (${normalizedTreatments.length})`}
            </button>
          )}

          <Link
            className={styles.back}
            to={`/patients/${patientId}`}
          >
            {t("cancel")}
          </Link>
        </div>
      </header>

      <section className={styles.card}>
        <div className={styles.sectionTitle}>
          <span>01</span>
          <div>
            <h2>{ar ? "الكشف وخطة الزيارة" : "Examination & visit plan"}</h2>
            <p>
              {ar
                ? "اختار الكشف والعلاجات كلها في نفس الشاشة. كل علاج يمكن ربطه بأسنان مختلفة قبل الانتقال للحساب مرة واحدة."
                : "Choose consultation and all treatments on one screen. Each treatment can have its own teeth before moving to billing once."}
            </p>
          </div>
        </div>

        <label className={styles.field}>
          <span>{t("doctorContext")}</span>
          <select
            required
            value={doctorId}
            onChange={event => {
              setDoctorId(event.target.value);
            }}
          >
            <option value="">—</option>
            {doctors.map(doctor => (
              <option key={doctor.doctorId} value={doctor.doctorId}>
                {doctor.fullName}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.quickVisitGrid}>
          <article className={styles.consultationCard}>
            <div className={styles.quickIcon}>
              <AppIcon name="tooth" />
            </div>
            <div className={styles.quickBody}>
              <span>{ar ? "أساسي في بداية الزيارة" : "Visit starter"}</span>
              <strong>{ar ? "كشف" : "Consultation"}</strong>
              <small>
                {consultationService
                  ? `${consultationService.currentPrice.toLocaleString()} EGP`
                  : ar
                    ? "خدمة الكشف غير موجودة في قائمة الخدمات"
                    : "Consultation service is missing from catalog"}
              </small>
            </div>
            <button
              type="button"
              disabled={!consultationService}
              className={consultationTreatment ? styles.toggleYes : styles.toggleNo}
              onClick={toggleConsultation}
            >
              {consultationTreatment
                ? ar ? "مضاف ✓" : "Added ✓"
                : ar ? "إضافة الكشف" : "Add consultation"}
            </button>
          </article>

          <article className={styles.depositCard}>
            <div className={styles.quickIcon}>
              <AppIcon name="debt" />
            </div>
            <div className={styles.quickBody}>
              <span>{ar ? "دفعة مقدمة" : "Advance payment"}</span>
              <strong>{ar ? "هل يوجد ديبوزيت؟" : "Deposit?"}</strong>
              <small>
                {ar
                  ? "الديفولت لا. عند نعم يتم خصمه تلقائيًا من المتبقي."
                  : "Defaults to No. If Yes, it is deducted from the remaining balance."}
              </small>
            </div>
            <div className={styles.yesNo}>
              <button
                type="button"
                className={!hasDeposit ? styles.yesNoActive : ""}
                onClick={() => {
                  setHasDeposit(false);
                  setDepositAmount("");
                  setDepositPaymentMethod("");
                }}
              >
                {ar ? "لا" : "No"}
              </button>
              <button
                type="button"
                className={hasDeposit ? styles.yesNoActive : ""}
                onClick={() => setHasDeposit(true)}
              >
                {ar ? "نعم" : "Yes"}
              </button>
            </div>
          </article>
        </div>

        {consultationTreatment && (
          <label className={`${styles.field} ${styles.examinationNotes}`}>
            <span>
              {ar
                ? "ملاحظات الكشف / ما لاحظه الطبيب"
                : "Examination findings"}
            </span>
            <textarea
              rows={4}
              value={examinationFindings}
              placeholder={
                ar
                  ? "مثال: تسوس بالضرس 26، التهاب لثة، يحتاج أشعة..."
                  : "Example: caries on 26, gingivitis, X-ray recommended..."
              }
              onChange={event => setExaminationFindings(event.target.value)}
              onBlur={() => persist()}
            />
          </label>
        )}

        {hasDeposit && (
          <div className={styles.depositFields}>
            <label className={styles.field}>
              <span>{ar ? "قيمة الديبوزيت" : "Deposit amount"}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={depositAmount}
                placeholder={ar ? "اكتب المبلغ" : "Enter amount"}
                onChange={event => setDepositAmount(event.target.value)}
                onBlur={() => persist()}
              />
            </label>

            <label className={styles.field}>
              <span>{ar ? "طريقة دفع الديبوزيت" : "Deposit payment method"}</span>
              <select
                value={depositPaymentMethod}
                onChange={event => {
                  setDepositPaymentMethod(event.target.value);
                }}
                onBlur={() => persist()}
              >
                <option value="">{ar ? "اختر طريقة الدفع" : "Select payment method"}</option>
                <option value="Cash">{ar ? "كاش" : "Cash"}</option>
                <option value="InstaPay">InstaPay</option>
                <option value="Vodafone Cash">Vodafone Cash</option>
              </select>
            </label>
          </div>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.sectionTitle}>
          <span>02</span>
          <div>
            <h2>{ar ? "إضافة العلاجات" : "Add treatments"}</h2>
            <p>
              {ar
                ? "اختار خدمة، علّم على السن أو الأسنان الخاصة بها، واضغط إضافة. الشاشة تفضل مفتوحة لإضافة علاج تاني على أسنان مختلفة."
                : "Choose a service, select its tooth/teeth, then add it. Stay on this screen to add more treatments to different teeth."}
            </p>
          </div>
        </div>

        <div className={styles.catalogBlock}>
          <div className={styles.catalogHeading}>
            <div>
              <strong>{ar ? "تصنيفات الخدمات" : "Service categories"}</strong>
              <span>
                {ar
                  ? "الكشف موجود فوق بشكل مستقل، وباقي العلاجات هنا."
                  : "Consultation is separate above; all other treatments are here."}
              </span>
            </div>
          </div>

          <div className={styles.categories}>
            {serviceGroups.map(([category, services]) => (
              <button
                type="button"
                key={category}
                className={category === activeCategory ? styles.activeCategory : ""}
                onClick={() => {
                  setSelectedCategory(category);
                  setServiceId("");
                  setSelectedTeeth([]);
                  setTreatmentNotes("");
                }}
              >
                <strong>{category}</strong>
                <span>{services.length}</span>
              </button>
            ))}
          </div>

          <div className={styles.servicesGrid}>
            {visibleServices.map(service => {
              const active = service.id === serviceId;
              const name = ar
                ? service.nameAr
                : service.nameEn || service.nameAr;

              return (
                <button
                  type="button"
                  key={service.id}
                  className={active ? styles.activeService : ""}
                  onClick={() => {
                    setServiceId(service.id);
                    setSelectedTeeth([]);
                    setTreatmentNotes("");
                  }}
                >
                  <div>
                    <strong>{name}</strong>
                    {service.pricingNoteAr && (
                      <small>{service.pricingNoteAr}</small>
                    )}
                  </div>
                  <b>{service.currentPrice.toLocaleString()} EGP</b>
                </button>
              );
            })}
          </div>
        </div>

        {selectedService && (
          <div className={styles.treatmentComposer}>
            <div className={styles.selectedServiceBanner}>
              <div>
                <span>{ar ? "الخدمة الحالية" : "Current service"}</span>
                <strong>
                  {ar
                    ? selectedService.nameAr
                    : selectedService.nameEn || selectedService.nameAr}
                </strong>
              </div>
              <b>{selectedService.currentPrice.toLocaleString()} EGP</b>
            </div>

            <DentalChart
              selectedTeeth={selectedTeeth}
              onChange={setSelectedTeeth}
            />

            <label className={styles.field}>
              <span>{ar ? "ملاحظة خاصة بالعلاج (اختياري)" : "Treatment note (optional)"}</span>
              <textarea
                rows={3}
                value={treatmentNotes}
                onChange={event => setTreatmentNotes(event.target.value)}
              />
            </label>

            <button
              type="button"
              className={styles.addTreatment}
              disabled={!selectedService || !doctorId}
              onClick={addTreatment}
            >
              <AppIcon name="plus" />
              {ar
                ? "إضافة العلاج للزيارة"
                : "Add treatment to visit"}
            </button>
          </div>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.sectionTitle}>
          <span>03</span>
          <div>
            <h2>{ar ? "العلاجات المضافة وملاحظة الطبيب" : "Visit plan & doctor note"}</h2>
            <p>
              {ar
                ? "راجع كل البنود قبل الحساب. ملاحظة الطبيب تفضل محفوظة في تاريخ الزيارة داخل بروفايل المريض."
                : "Review all items before billing. The doctor note remains in the patient's visit history."}
            </p>
          </div>
        </div>

        {normalizedTreatments.length > 0 ? (
          <div className={styles.visitPlan}>
            {normalizedTreatments.map((item, index) => (
              <article key={`${item.dentalServiceId}-${index}`}>
                <div className={styles.planNumber}>{index + 1}</div>
                <div className={styles.planInfo}>
                  <strong>{item.serviceName}</strong>
                  <span>
                    {item.toothNumbers.length > 0
                      ? `${ar ? "الأسنان" : "Teeth"}: ${item.toothNumbers.join(" • ")}`
                      : ar ? "بدون سن محدد" : "No specific tooth"}
                  </span>
                  {item.notes && <small>{item.notes}</small>}
                </div>
                <b>{item.unitPrice.toLocaleString()} EGP</b>
                <button
                  type="button"
                  className={styles.removeTreatment}
                  onClick={() => removeTreatment(index)}
                  aria-label={ar ? "حذف العلاج" : "Remove treatment"}
                >
                  ×
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyPlan}>
            {ar
              ? "لسه مفيش كشف أو علاج مضاف للزيارة."
              : "No consultation or treatment has been added yet."}
          </div>
        )}

        <label className={`${styles.field} ${styles.doctorNote}`}>
          <span>{ar ? "ملاحظة / تذكرة للطبيب" : "Doctor note / reminder"}</span>
          <textarea
            rows={4}
            value={clinicalNotes}
            placeholder={
              ar
                ? "أي ملاحظة مهمة للزيارة أو شيء يحتاج الطبيب يفتكره بعدين..."
                : "Any important visit note or reminder for later..."
            }
            onChange={event => setClinicalNotes(event.target.value)}
            onBlur={() => persist()}
          />
        </label>

        <button
          type="button"
          className={styles.continueButton}
          disabled={
            !doctorId
            || normalizedTreatments.length === 0
            || (
              hasDeposit
              && Number(depositAmount || 0) > 0
              && !depositPaymentMethod
            )
          }
          onClick={continueToBilling}
        >
          <span>
            {ar ? "المتابعة للحساب" : "Continue to billing"}
          </span>
          <small>
            {normalizedTreatments.length.toLocaleString(ar ? "ar-EG" : "en-US")}
            {ar ? " بند" : " item(s)"}
          </small>
          <AppIcon name="chevron" />
        </button>
      </section>
    </section>
  );
}
