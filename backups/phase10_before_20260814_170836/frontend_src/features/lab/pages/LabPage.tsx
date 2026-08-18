import { useMemo, useState, type FormEvent } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLanguage } from "../../../i18n/LanguageContext";
import { useAuth } from "../../auth/AuthContext";
import { getDentalServices } from "../../services/api/servicesApi";
import {
  createLabExpense,
  createLabOrder,
  getLabExpenses,
  getLabOrders,
  lookupLabPatient,
} from "../api/labApi";
import type {
  LabPatientLookup,
  LabPatientLookupVisit,
} from "../../../types/operations";
import styles from "./LabPage.module.css";

const workTypes = [
  "Crown",
  "Bridge",
  "Veneer",
  "Inlay",
  "Onlay",
  "Maryland Bridge",
];

const materials = [
  "PFM-VMK Master",
  "PFM-VM13",
  "Zircon VM9",
  "Full Zircon",
  "E-Max-Crown",
  "E-Max-Veneer",
  "Thermopress",
  "Night Guard",
  "Hollywood Smile",
  "Acrylic",
  "Temporarily",
];

export function LabPage() {
  const { language } = useLanguage();
  const ar = language === "ar";
  const { hasRole } = useAuth();

  const canViewLabCosts =
    hasRole("Owner")
    || hasRole("Doctor");

  const client = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] =
    useState<LabPatientLookup | null>(null);
  const [selectedVisit, setSelectedVisit] =
    useState<LabPatientLookupVisit | null>(null);

  const [work, setWork] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [caseDescription, setCaseDescription] = useState("");
  const [shade, setShade] = useState("");
  const [digitalPhotosSent, setDigitalPhotosSent] = useState(false);
  const [valueLevel, setValueLevel] = useState("");
  const [occlusalStaining, setOcclusalStaining] = useState("");
  const [instructions, setInstructions] = useState("");

  const [expenseForm, setExpenseForm] = useState({
    serviceOrItemName: "",
    amount: 0,
    notes: "",
  });

  const [
    customExpenseService,
    setCustomExpenseService,
  ] = useState("");

  const lookupQuery = useQuery({
    queryKey: ["lab-patient-lookup", search],
    queryFn: () => lookupLabPatient(search),
    enabled: search.trim().length >= 2,
    staleTime: 10_000,
  });

  const ordersQuery = useQuery({
    queryKey: ["lab-orders"],
    queryFn: getLabOrders,
  });

  const expensesQuery = useQuery({
    queryKey: ["lab-expenses"],
    queryFn: getLabExpenses,
    enabled: canViewLabCosts,
  });

  const dentalServicesQuery = useQuery({
    queryKey: ["dental-services", "lab-selector"],
    queryFn: () => getDentalServices(false),
    staleTime: 60_000,
  });

  const serviceGroups = useMemo(() => {
    const map = new Map<string, typeof dentalServicesQuery.data>();

    for (const service of dentalServicesQuery.data ?? []) {
      const list = map.get(service.category) ?? [];
      list.push(service);
      map.set(service.category, list);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, ar ? "ar" : "en"));
  }, [dentalServicesQuery.data, ar]);

  const selectedDoctorId = selectedVisit?.doctorId ?? null;

  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["lab-orders"] }),
      client.invalidateQueries({ queryKey: ["lab-expenses"] }),
      client.invalidateQueries({ queryKey: ["dashboard"] }),
      client.invalidateQueries({ queryKey: ["finance"] }),
    ]);
  };

  const orderMutation = useMutation({
    mutationFn: () => {
      if (!selectedPatient || !selectedVisit) {
        throw new Error("Select patient visit");
      }

      return createLabOrder({
        patientId: selectedPatient.patientId,
        doctorId: selectedVisit.doctorId,
        visitId: selectedVisit.visitId,
        caseDescription: caseDescription || null,
        workTypes: work,
        toothNumbers: [],
        materialOptions: selectedMaterials,
        shade: shade || null,
        digitalPhotosSent,
        valueLevel: valueLevel || null,
        occlusalStaining: occlusalStaining || null,
        instructions: instructions || null,
      });
    },
    onSuccess: async () => {
      setWork([]);
      setSelectedMaterials([]);
      setCaseDescription("");
      setShade("");
      setDigitalPhotosSent(false);
      setValueLevel("");
      setOcclusalStaining("");
      setInstructions("");
      await refresh();
    },
  });

  const expenseMutation = useMutation({
    mutationFn: () => {
      if (!selectedPatient || !selectedVisit) {
        throw new Error("Select patient visit");
      }

      return createLabExpense({
        patientId: selectedPatient.patientId,
        doctorId: selectedVisit.doctorId,
        visitId: selectedVisit.visitId,
        labOrderId: null,
        serviceOrItemName:
          expenseForm.serviceOrItemName === "__OTHER__"
            ? customExpenseService.trim()
            : expenseForm.serviceOrItemName,
        amount: Number(expenseForm.amount),
        expenseDateUtc: new Date().toISOString(),
        notes: expenseForm.notes || null,
      });
    },
    onSuccess: async () => {
      setExpenseForm({
        serviceOrItemName: "",
        amount: 0,
        notes: "",
      });
      setCustomExpenseService("");
      await refresh();
    },
  });

  const activeContext = useMemo(
    () =>
      selectedPatient && selectedVisit
        ? `${selectedPatient.fullName} — ${selectedVisit.doctorName} — ${new Date(
            selectedVisit.visitDateUtc,
          ).toLocaleDateString(ar ? "ar-EG" : "en-GB")}`
        : null,
    [selectedPatient, selectedVisit, ar],
  );

  function toggle(
    value: string,
    current: string[],
    setter: (value: string[]) => void,
  ) {
    setter(
      current.includes(value)
        ? current.filter(x => x !== value)
        : [...current, value],
    );
  }

  function submitOrder(event: FormEvent) {
    event.preventDefault();
    orderMutation.mutate();
  }

  function submitExpense(event: FormEvent) {
    event.preventDefault();
    expenseMutation.mutate();
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Laboratory</p>
          <h1>{ar ? "المعمل" : "Laboratory"}</h1>
          <p>
            {ar
              ? "أوامر التركيبات الثابتة ومصروفات المعمل مرتبطة بالمريض والزيارة."
              : "Fixed prosthodontic orders and lab costs linked to patient visits."}
          </p>
        </div>
      </header>

      <section className={styles.lookupCard}>
        <div className={styles.stepHeader}>
          <span>01</span>
          <div>
            <h2>{ar ? "اختر المريض والزيارة" : "Select patient and visit"}</h2>
            <p>
              {ar
                ? "ابدأ بكود المريض أو رقم الاستمارة أو الاسم، وبعدها اختر الزيارة المرتبطة بالعمل."
                : "Start with patient code, form number or name, then choose the linked visit."}
            </p>
          </div>
        </div>

        <label className={styles.searchField}>
          <span>{ar ? "كود المريض / رقم الاستمارة / الاسم" : "Patient code / form / name"}</span>
          <input
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setSelectedPatient(null);
              setSelectedVisit(null);
            }}
            placeholder={ar ? "اكتب للبحث..." : "Search..."}
          />
        </label>

        {lookupQuery.data && lookupQuery.data.length > 0 && !selectedPatient && (
          <div className={styles.searchResults}>
            {lookupQuery.data.map(patient => (
              <button
                type="button"
                key={patient.patientId}
                onClick={() => {
                  setSelectedPatient(patient);
                  setSelectedVisit(patient.recentVisits[0] ?? null);
                }}
              >
                <strong>{patient.fullName}</strong>
                <span>
                  {patient.patientCode}
                  {patient.formNumber ? ` • ${patient.formNumber}` : ""}
                </span>
                {patient.isBlacklisted && (
                  <small>{ar ? "قائمة عدم الالتزام" : "Blacklisted"}</small>
                )}
              </button>
            ))}
          </div>
        )}

        {selectedPatient && (
          <div className={styles.patientContext}>
            <div>
              <strong>{selectedPatient.fullName}</strong>
              <span>
                {selectedPatient.patientCode}
                {" • "}
                {selectedPatient.phoneNumber}
              </span>
              <small>
                {ar ? "العمر" : "Age"}:
                {" "}
                {selectedPatient.age ?? "—"}
                {" • "}
                {ar ? "النوع" : "Gender"}:
                {" "}
                {selectedPatient.gender ?? "—"}
                {" • "}
                {ar ? "العنوان" : "Address"}:
                {" "}
                {selectedPatient.address ?? "—"}
              </small>
            </div>

            <label>
              <span>{ar ? "الزيارة" : "Visit"}</span>
              <select
                value={selectedVisit?.visitId ?? ""}
                onChange={e => {
                  const visit =
                    selectedPatient.recentVisits.find(
                      x => x.visitId === e.target.value,
                    ) ?? null;
                  setSelectedVisit(visit);
                }}
              >
                <option value="">—</option>
                {selectedPatient.recentVisits.map(visit => (
                  <option key={visit.visitId} value={visit.visitId}>
                    {new Date(visit.visitDateUtc).toLocaleDateString(
                      ar ? "ar-EG" : "en-GB",
                    )} — {visit.doctorName}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => {
                setSelectedPatient(null);
                setSelectedVisit(null);
                setSearch("");
              }}
            >
              {ar ? "تغيير المريض" : "Change patient"}
            </button>
          </div>
        )}

        {selectedPatient && selectedPatient.recentVisits.length === 0 && (
          <div className={styles.warning}>
            {ar
              ? "لا توجد زيارة مسجلة لهذا المريض داخل النطاق الحالي. سجّل الزيارة أولًا ثم أضف مصروف/طلب المعمل."
              : "No visit exists for this patient in the current scope. Create the visit first."}
          </div>
        )}
      </section>

      {canViewLabCosts ? (
        <div className={styles.twoColumns}>
        <form className={styles.card} onSubmit={submitExpense}>
          <div className={styles.stepHeader}>
            <span>02</span>
            <div>
              <h2>{ar ? "تسجيل تكلفة المعمل" : "Record lab expense"}</h2>
              <p>
                {ar
                  ? "اختر الخدمة من القائمة، ثم اكتب تكلفة المعمل الفعلية. السعر هنا تكلفة على العيادة وليس سعر المريض."
                  : "Choose the service, then enter the actual lab cost. This is clinic cost, not the patient price."}
              </p>
            </div>
          </div>
          <p className={styles.contextText}>{activeContext || "—"}</p>

          <label>
            <span>{ar ? "الصنف أو الخدمة" : "Item / service"}</span>
            <select
              required
              value={expenseForm.serviceOrItemName}
              onChange={e =>
                setExpenseForm({
                  ...expenseForm,
                  serviceOrItemName: e.target.value,
                })
              }
            >
              <option value="">
                {ar ? "اختر من قائمة الخدمات" : "Choose from services"}
              </option>

              {serviceGroups.map(([category, services]) => (
                <optgroup key={category} label={category}>
                  {services?.map(service => (
                    <option
                      key={service.id}
                      value={ar ? service.nameAr : (service.nameEn || service.nameAr)}
                    >
                      {ar ? service.nameAr : (service.nameEn || service.nameAr)}
                    </option>
                  ))}
                </optgroup>
              ))}

              <option value="__OTHER__">
                {ar ? "أخرى - إدخال يدوي" : "Other - manual entry"}
              </option>
            </select>
          </label>

          {expenseForm.serviceOrItemName === "__OTHER__" && (
            <label>
              <span>{ar ? "اكتب الصنف" : "Custom item"}</span>
              <input
                required
                value={customExpenseService}
                placeholder={ar ? "مثال: طربوش خاص / شغل خارجي..." : "e.g. custom crown / external work..."}
                onChange={e =>
                  setCustomExpenseService(e.target.value)
                }
              />
            </label>
          )}

          <label>
            <span>{ar ? "القيمة" : "Amount"}</span>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={expenseForm.amount}
              onChange={e =>
                setExpenseForm({
                  ...expenseForm,
                  amount: Number(e.target.value),
                })
              }
            />
          </label>

          <label>
            <span>{ar ? "ملاحظات" : "Notes"}</span>
            <textarea
              rows={3}
              value={expenseForm.notes}
              onChange={e =>
                setExpenseForm({
                  ...expenseForm,
                  notes: e.target.value,
                })
              }
            />
          </label>

          <button
            disabled={
              !selectedPatient
              || !selectedVisit
              || !expenseForm.serviceOrItemName
              || (
                expenseForm.serviceOrItemName === "__OTHER__"
                && !customExpenseService.trim()
              )
              || expenseMutation.isPending
            }
          >
            {ar ? "حفظ تكلفة المعمل" : "Save lab expense"}
          </button>
        </form>

        <section className={styles.card}>
          <h2>{ar ? "آخر مصروفات المعمل" : "Recent lab expenses"}</h2>

          <div className={styles.compactList}>
            {expensesQuery.data?.slice(0, 10).map(expense => (
              <article key={expense.id}>
                <div>
                  <strong>{expense.patientName}</strong>
                  <small>
                    {expense.serviceOrItemName} • {expense.doctorName}
                  </small>
                </div>
                <span>{expense.amount.toLocaleString()} EGP</span>
              </article>
            ))}
          </div>
        </section>
      </div>
      ) : (
        <section className={styles.operationalNotice}>
          <strong>
            {ar ? "وضع التشغيل للسكرتيرة / الممرضة" : "Staff operational mode"}
          </strong>
          <p>
            {ar
              ? "يمكنك اختيار المريض والزيارة وإنشاء أمر المعمل ومتابعة تفاصيل الشغل، لكن تكلفة المعمل والمصروفات المالية مخفية من هذا الحساب."
              : "You can select the patient and visit, create lab orders and manage the work details, while lab cost and financial expense data stay hidden."}
          </p>
        </section>
      )}


      <form className={styles.orderCard} onSubmit={submitOrder}>
        <div className={styles.orderHeader}>
          <div>
            <p>Cairo Dent style</p>
            <h2>{ar ? "Order Form for Fixed Prosthodontics" : "Order Form for Fixed Prosthodontics"}</h2>
            <small>{activeContext || "—"}</small>
          </div>
          <strong>{selectedDoctorId ? "VISIT LINKED" : "SELECT VISIT"}</strong>
        </div>

        <div className={styles.orderGrid}>
          <section>
            <label>
              <span>{ar ? "وصف الحالة" : "Case Description"}</span>
              <textarea
                rows={6}
                value={caseDescription}
                onChange={e => setCaseDescription(e.target.value)}
              />
            </label>

            <fieldset>
              <legend>{ar ? "نوع العمل" : "Type of work"}</legend>
              <div className={styles.checkGrid}>
                {workTypes.map(value => (
                  <label key={value}>
                    <input
                      type="checkbox"
                      checked={work.includes(value)}
                      onChange={() => toggle(value, work, setWork)}
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <section>
            <fieldset>
              <legend>{ar ? "الخامة" : "Material"}</legend>
              <div className={styles.checkGrid}>
                {materials.map(value => (
                  <label key={value}>
                    <input
                      type="checkbox"
                      checked={selectedMaterials.includes(value)}
                      onChange={() =>
                        toggle(value, selectedMaterials, setSelectedMaterials)
                      }
                    />
                    <span>{value}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={styles.smallGrid}>
              <label>
                <span>Shade / VITA</span>
                <input value={shade} onChange={e => setShade(e.target.value)} />
              </label>

              <label>
                <span>Value</span>
                <select
                  value={valueLevel}
                  onChange={e => setValueLevel(e.target.value)}
                >
                  <option value="">—</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </label>

              <label>
                <span>Occlusal Staining</span>
                <select
                  value={occlusalStaining}
                  onChange={e => setOcclusalStaining(e.target.value)}
                >
                  <option value="">—</option>
                  <option value="None">None</option>
                  <option value="Light">Light</option>
                  <option value="Medium">Medium</option>
                </select>
              </label>

              <label className={styles.inlineCheck}>
                <input
                  type="checkbox"
                  checked={digitalPhotosSent}
                  onChange={e => setDigitalPhotosSent(e.target.checked)}
                />
                <span>Digital photos sent</span>
              </label>
            </div>
          </section>
        </div>

        <label className={styles.instructions}>
          <span>{ar ? "تعليمات المعمل" : "Instructions"}</span>
          <textarea
            rows={5}
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
          />
        </label>

        <button
          className={styles.submitOrder}
          disabled={
            !selectedPatient
            || !selectedVisit
            || orderMutation.isPending
          }
        >
          {ar ? "حفظ أمر المعمل" : "Save lab order"}
        </button>
      </form>

      <section className={styles.card}>
        <h2>{ar ? "أوامر المعمل الأخيرة" : "Recent lab orders"}</h2>
        <div className={styles.ordersList}>
          {ordersQuery.data?.map(order => (
            <article key={order.id}>
              <div>
                <strong>{order.serialNumber}</strong>
                <span>{order.patientName} • {order.doctorName}</span>
              </div>
              <div>
                <small>{order.workTypes.join(" • ") || "—"}</small>
              </div>
              <small>
                {new Date(order.createdAtUtc).toLocaleDateString(
                  ar ? "ar-EG" : "en-GB",
                )}
              </small>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
