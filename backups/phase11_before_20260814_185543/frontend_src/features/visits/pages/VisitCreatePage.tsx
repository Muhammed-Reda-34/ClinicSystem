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
} from "../visitDraft";
import styles from "./VisitCreatePage.module.css";

export function VisitCreatePage() {
  const { patientId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { doctors, selectedDoctor } = useDoctorContext();

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

  const [selectedCategory, setSelectedCategory] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);

  const serviceGroups = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<typeof servicesQuery.data>
    >();

    for (const service of servicesQuery.data ?? []) {
      const list = map.get(service.category) ?? [];
      list.push(service);
      map.set(service.category, list);
    }

    return Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b, language === "ar" ? "ar" : "en"),
    );
  }, [servicesQuery.data, language]);

  const activeCategory =
    selectedCategory || serviceGroups[0]?.[0] || "";

  const visibleServices =
    serviceGroups.find(([category]) => category === activeCategory)?.[1]
    ?? [];

  const selectedService = servicesQuery.data?.find(
    service => service.id === serviceId,
  ) ?? null;

  const currentDraft = patientId ? loadVisitDraft(patientId) : null;
  const draftCount = currentDraft?.treatments.length ?? 0;

  function addTreatmentAndContinue() {
    if (!patientId || !doctorId || !selectedService) {
      return;
    }

    const previous = loadVisitDraft(patientId);
    const canReusePrevious =
      previous
      && previous.doctorId === doctorId
      && previous.appointmentId === (appointmentId || null);

    const treatments = canReusePrevious
      ? previous.treatments
      : [];

    saveVisitDraft({
      patientId,
      doctorId,
      appointmentId: appointmentId || null,
      treatments: [
        ...treatments,
        {
          dentalServiceId: selectedService.id,
          quantity: 1,
          toothNumbers: selectedTeeth,
          notes: null,
          serviceName:
            language === "ar"
              ? selectedService.nameAr
              : selectedService.nameEn || selectedService.nameAr,
          unitPrice: selectedService.currentPrice,
        },
      ],
    });

    navigate(`/patients/${patientId}/visits/new/billing`);
  }

  if (patientQuery.isLoading || servicesQuery.isLoading) {
    return <div className={styles.state}>{t("loading")}</div>;
  }

  if (!patientQuery.data || servicesQuery.isError) {
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
          <p className={styles.eyebrow}>Clinical Visit • Step 01</p>
          <h1>{t("newVisit")}</h1>
          <p>
            {patientQuery.data.fullName}
            {" • "}
            {patientQuery.data.patientCode}
          </p>
        </div>

        <div className={styles.headerActions}>
          {draftCount > 0 && (
            <Link
              className={styles.draftButton}
              to={`/patients/${patientId}/visits/new/billing`}
            >
              {language === "ar"
                ? `الحساب والمتابعة (${draftCount})`
                : `Billing & follow-up (${draftCount})`}
            </Link>
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
            <h2>{t("treatment")}</h2>
            <p>
              {language === "ar"
                ? "اختر الطبيب ثم التصنيف والخدمة. الكمية ثابتة 1؛ لا يوجد حقل كمية. بعد إضافة العلاج تنتقل مباشرة لصفحة الحساب والمتابعة."
                : "Choose doctor, category and service. Quantity is fixed at 1. Adding treatment takes you directly to billing and follow-up."}
            </p>
          </div>
        </div>

        <label className={styles.field}>
          <span>{t("doctorContext")}</span>
          <select
            required
            value={doctorId}
            onChange={event => setDoctorId(event.target.value)}
          >
            <option value="">—</option>
            {doctors.map(doctor => (
              <option key={doctor.doctorId} value={doctor.doctorId}>
                {doctor.fullName}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.catalogBlock}>
          <div className={styles.catalogHeading}>
            <div>
              <strong>
                {language === "ar" ? "تصنيفات الخدمات" : "Service categories"}
              </strong>
              <span>
                {language === "ar"
                  ? "اختار التصنيف الأول بدل البحث داخل قائمة طويلة."
                  : "Choose a category first instead of searching through one long dropdown."}
              </span>
            </div>
          </div>

          <div className={styles.categories}>
            {serviceGroups.map(([category, services]) => (
              <button
                type="button"
                key={category}
                className={
                  category === activeCategory
                    ? styles.activeCategory
                    : ""
                }
                onClick={() => {
                  setSelectedCategory(category);
                  setServiceId("");
                  setSelectedTeeth([]);
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
              const name =
                language === "ar"
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
          <div className={styles.selectedServiceBanner}>
            <div>
              <span>{language === "ar" ? "الخدمة المختارة" : "Selected service"}</span>
              <strong>
                {language === "ar"
                  ? selectedService.nameAr
                  : selectedService.nameEn || selectedService.nameAr}
              </strong>
            </div>
            <b>{selectedService.currentPrice.toLocaleString()} EGP</b>
          </div>
        )}

        <DentalChart
          selectedTeeth={selectedTeeth}
          onChange={setSelectedTeeth}
        />

        <button
          type="button"
          className={styles.addTreatment}
          disabled={!selectedService || !doctorId}
          onClick={addTreatmentAndContinue}
        >
          {language === "ar"
            ? "إضافة العلاج والمتابعة للحساب"
            : "Add treatment & continue to billing"}
        </button>
      </section>
    </section>
  );
}
