import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
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
  const client = useQueryClient();

  const canViewLabCosts =
    hasRole("Owner") || hasRole("Doctor");

  const canEnterLabCost =
    hasRole("Owner")
    || hasRole("Doctor")
    || hasRole("Secretary")
    || hasRole("Nurse");

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

  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseForm, setExpenseForm] = useState({
    serviceOrItemName: "",
    amount: "",
    notes: "",
  });
  const [customExpenseService, setCustomExpenseService] = useState("");

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
    const map = new Map<
      string,
      NonNullable<typeof dentalServicesQuery.data>
    >();

    for (const service of dentalServicesQuery.data ?? []) {
      const list = map.get(service.category) ?? [];
      list.push(service);
      map.set(service.category, list);
    }

    return Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b, ar ? "ar" : "en"),
    );
  }, [dentalServicesQuery.data, ar]);

  const categoryServices = useMemo(
    () =>
      serviceGroups.find(([category]) => category === expenseCategory)?.[1]
      ?? [],
    [serviceGroups, expenseCategory],
  );

  const activeContext = useMemo(
    () =>
      selectedPatient && selectedVisit
        ? `${selectedPatient.fullName} • ${selectedVisit.doctorName} • ${new Date(
            selectedVisit.visitDateUtc,
          ).toLocaleDateString(ar ? "ar-EG" : "en-GB")}`
        : null,
    [selectedPatient, selectedVisit, ar],
  );

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

      const serviceOrItemName =
        expenseForm.serviceOrItemName === "__OTHER__"
          ? customExpenseService.trim()
          : expenseForm.serviceOrItemName;

      return createLabExpense({
        patientId: selectedPatient.patientId,
        doctorId: selectedVisit.doctorId,
        visitId: selectedVisit.visitId,
        labOrderId: null,
        serviceOrItemName,
        amount: Number(expenseForm.amount),
        expenseDateUtc: new Date().toISOString(),
        notes: expenseForm.notes || null,
      });
    },
    onSuccess: async () => {
      setExpenseCategory("");
      setExpenseForm({
        serviceOrItemName: "",
        amount: "",
        notes: "",
      });
      setCustomExpenseService("");
      await refresh();
    },
  });

  function toggle(
    value: string,
    current: string[],
    setter: (value: string[]) => void,
  ) {
    setter(
      current.includes(value)
        ? current.filter(item => item !== value)
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
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Laboratory Workspace</p>
          <h1>{ar ? "المعمل" : "Laboratory"}</h1>
          <p>
            {ar
              ? "شاشة واحدة مرتبة لاختيار المريض والزيارة، تسجيل أمر المعمل وقيمة المعمل بدون مخطط الأسنان."
              : "A cleaner workspace for patient selection, lab orders and lab cost entry without a dental chart."}
          </p>
        </div>

        <div className={styles.heroHint}>
          <span>01</span>
          <strong>{ar ? "مريض" : "Patient"}</strong>
          <i />
          <span>02</span>
          <strong>{ar ? "زيارة" : "Visit"}</strong>
          <i />
          <span>03</span>
          <strong>{ar ? "أمر + قيمة" : "Order + Cost"}</strong>
        </div>
      </header>

      <section className={styles.patientPanel}>
        <div className={styles.panelTitle}>
          <div>
            <span>01</span>
            <div>
              <h2>{ar ? "اختيار المريض والزيارة" : "Select patient and visit"}</h2>
              <p>
                {ar
                  ? "ابحث بالكود أو رقم الاستمارة أو الاسم أو الهاتف."
                  : "Search by patient code, form number, name or phone."}
              </p>
            </div>
          </div>
        </div>

        {!selectedPatient ? (
          <>
            <div className={styles.searchBox}>
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={
                  ar
                    ? "اكتب اسم المريض، الكود أو رقم الهاتف..."
                    : "Patient name, code or phone..."
                }
              />
              <span>{ar ? "بحث" : "Search"}</span>
            </div>

            {lookupQuery.data && lookupQuery.data.length > 0 && (
              <div className={styles.patientResults}>
                {lookupQuery.data.map(patient => (
                  <button
                    type="button"
                    key={patient.patientId}
                    onClick={() => {
                      setSelectedPatient(patient);
                      setSelectedVisit(patient.recentVisits[0] ?? null);
                    }}
                  >
                    <div>
                      <strong>{patient.fullName}</strong>
                      <span>{patient.phoneNumber}</span>
                    </div>
                    <small>
                      {patient.patientCode}
                      {patient.formNumber ? ` • ${patient.formNumber}` : ""}
                    </small>
                    {patient.isBlacklisted && (
                      <b>{ar ? "بلاك ليست" : "Blacklist"}</b>
                    )}
                  </button>
                ))}
              </div>
            )}

            {search.trim().length >= 2
              && !lookupQuery.isLoading
              && lookupQuery.data?.length === 0 && (
                <div className={styles.emptySearch}>
                  {ar ? "لا يوجد مريض مطابق للبحث." : "No matching patient."}
                </div>
              )}
          </>
        ) : (
          <div className={styles.selectedPatientCard}>
            <div className={styles.patientIdentity}>
              <span className={styles.avatar}>
                {selectedPatient.fullName.trim().charAt(0)}
              </span>
              <div>
                <strong>{selectedPatient.fullName}</strong>
                <span>
                  {selectedPatient.patientCode} • {selectedPatient.phoneNumber}
                </span>
                <small>
                  {ar ? "العمر" : "Age"}: {selectedPatient.age ?? "—"}
                  {" • "}
                  {ar ? "العنوان" : "Address"}: {selectedPatient.address ?? "—"}
                </small>
              </div>
            </div>

            <label className={styles.visitPicker}>
              <span>{ar ? "الزيارة المرتبطة بالشغل" : "Linked visit"}</span>
              <select
                value={selectedVisit?.visitId ?? ""}
                onChange={event => {
                  const visit = selectedPatient.recentVisits.find(
                    item => item.visitId === event.target.value,
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
              className={styles.changePatient}
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
              ? "لا توجد زيارة مسجلة لهذا المريض. أنشئ زيارة أولًا قبل تسجيل شغل أو قيمة المعمل."
              : "This patient has no visit yet. Create a visit before recording lab work or cost."}
          </div>
        )}
      </section>

      <div className={styles.workspaceGrid}>
        <form className={styles.orderCard} onSubmit={submitOrder}>
          <div className={styles.cardHeader}>
            <span>02</span>
            <div>
              <h2>{ar ? "أمر المعمل" : "Lab order"}</h2>
              <p>{activeContext ?? (ar ? "اختر المريض والزيارة أولًا" : "Select patient and visit first")}</p>
            </div>
          </div>

          <label className={styles.field}>
            <span>{ar ? "وصف الحالة" : "Case description"}</span>
            <textarea
              rows={4}
              value={caseDescription}
              onChange={event => setCaseDescription(event.target.value)}
              placeholder={ar ? "ملاحظات الحالة المطلوبة للمعمل..." : "Case notes for the lab..."}
            />
          </label>

          <fieldset className={styles.choiceGroup}>
            <legend>{ar ? "نوع العمل" : "Type of work"}</legend>
            <div className={styles.chips}>
              {workTypes.map(value => (
                <label
                  key={value}
                  className={work.includes(value) ? styles.selectedChip : ""}
                >
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

          <fieldset className={styles.choiceGroup}>
            <legend>{ar ? "الخامة" : "Material"}</legend>
            <div className={styles.chips}>
              {materials.map(value => (
                <label
                  key={value}
                  className={selectedMaterials.includes(value) ? styles.selectedChip : ""}
                >
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

          <div className={styles.compactGrid}>
            <label className={styles.field}>
              <span>Shade / VITA</span>
              <input value={shade} onChange={event => setShade(event.target.value)} />
            </label>

            <label className={styles.field}>
              <span>Value</span>
              <select value={valueLevel} onChange={event => setValueLevel(event.target.value)}>
                <option value="">—</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </label>

            <label className={styles.field}>
              <span>Occlusal Staining</span>
              <select
                value={occlusalStaining}
                onChange={event => setOcclusalStaining(event.target.value)}
              >
                <option value="">—</option>
                <option value="None">None</option>
                <option value="Light">Light</option>
                <option value="Medium">Medium</option>
              </select>
            </label>

            <label className={styles.photoCheck}>
              <input
                type="checkbox"
                checked={digitalPhotosSent}
                onChange={event => setDigitalPhotosSent(event.target.checked)}
              />
              <span>{ar ? "تم إرسال الصور الرقمية" : "Digital photos sent"}</span>
            </label>
          </div>

          <label className={styles.field}>
            <span>{ar ? "تعليمات المعمل" : "Lab instructions"}</span>
            <textarea
              rows={4}
              value={instructions}
              onChange={event => setInstructions(event.target.value)}
            />
          </label>

          {orderMutation.isSuccess && (
            <div className={styles.successMessage}>
              {ar ? "تم حفظ أمر المعمل." : "Lab order saved."}
            </div>
          )}

          {orderMutation.isError && (
            <div className={styles.errorMessage}>
              {ar ? "تعذر حفظ أمر المعمل." : "Could not save lab order."}
            </div>
          )}

          <button
            className={styles.primaryButton}
            disabled={!selectedPatient || !selectedVisit || orderMutation.isPending}
          >
            {orderMutation.isPending
              ? ar ? "جاري الحفظ..." : "Saving..."
              : ar ? "حفظ أمر المعمل" : "Save lab order"}
          </button>
        </form>

        <form className={styles.costCard} onSubmit={submitExpense}>
          <div className={styles.cardHeader}>
            <span>03</span>
            <div>
              <h2>{ar ? "قيمة المعمل" : "Lab cost"}</h2>
              <p>
                {ar
                  ? "الطبيب أو السكرتيرة أو الممرضة يمكنهم تسجيل القيمة. إجماليات المصروف تظهر للحسابات المصرح لها فقط."
                  : "Doctors, secretaries and nurses can record the cost; financial totals remain visible only to authorized roles."}
              </p>
            </div>
          </div>

          <div className={styles.costContext}>
            <span>{ar ? "الحالة الحالية" : "Current case"}</span>
            <strong>{activeContext ?? "—"}</strong>
          </div>

          <label className={styles.field}>
            <span>{ar ? "التصنيف" : "Category"}</span>
            <select
              value={expenseCategory}
              onChange={event => {
                setExpenseCategory(event.target.value);
                setExpenseForm(current => ({
                  ...current,
                  serviceOrItemName: "",
                }));
              }}
            >
              <option value="">{ar ? "اختر التصنيف" : "Choose category"}</option>
              {serviceGroups.map(([category]) => (
                <option key={category} value={category}>{category}</option>
              ))}
              <option value="__OTHER__">{ar ? "أخرى" : "Other"}</option>
            </select>
          </label>

          {expenseCategory && expenseCategory !== "__OTHER__" && (
            <label className={styles.field}>
              <span>{ar ? "الخدمة" : "Service"}</span>
              <select
                required
                value={expenseForm.serviceOrItemName}
                onChange={event =>
                  setExpenseForm(current => ({
                    ...current,
                    serviceOrItemName: event.target.value,
                  }))
                }
              >
                <option value="">{ar ? "اختر الخدمة" : "Choose service"}</option>
                {categoryServices.map(service => (
                  <option
                    key={service.id}
                    value={ar ? service.nameAr : (service.nameEn || service.nameAr)}
                  >
                    {ar ? service.nameAr : (service.nameEn || service.nameAr)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {expenseCategory === "__OTHER__" && (
            <label className={styles.field}>
              <span>{ar ? "اسم الشغل / الصنف" : "Work / item name"}</span>
              <input
                required
                value={customExpenseService}
                onChange={event => {
                  setCustomExpenseService(event.target.value);
                  setExpenseForm(current => ({
                    ...current,
                    serviceOrItemName: "__OTHER__",
                  }));
                }}
                placeholder={ar ? "اكتب اسم شغل المعمل" : "Enter lab work name"}
              />
            </label>
          )}

          <label className={styles.amountField}>
            <span>{ar ? "قيمة المعمل" : "Lab cost"}</span>
            <div>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={expenseForm.amount}
                onChange={event =>
                  setExpenseForm(current => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                placeholder="0.00"
              />
              <b>EGP</b>
            </div>
          </label>

          <label className={styles.field}>
            <span>{ar ? "ملاحظات" : "Notes"}</span>
            <textarea
              rows={3}
              value={expenseForm.notes}
              onChange={event =>
                setExpenseForm(current => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </label>

          {expenseMutation.isSuccess && (
            <div className={styles.successMessage}>
              {ar
                ? "تم تسجيل قيمة المعمل وستظهر فورًا في حساب مصروفات الطبيب."
                : "Lab cost saved and reflected in the doctor's expense totals."}
            </div>
          )}

          {expenseMutation.isError && (
            <div className={styles.errorMessage}>
              {ar ? "تعذر حفظ قيمة المعمل." : "Could not save lab cost."}
            </div>
          )}

          <button
            className={styles.costButton}
            disabled={
              !canEnterLabCost
              || !selectedPatient
              || !selectedVisit
              || !expenseForm.amount
              || !expenseForm.serviceOrItemName
              || (
                expenseForm.serviceOrItemName === "__OTHER__"
                && !customExpenseService.trim()
              )
              || expenseMutation.isPending
            }
          >
            {expenseMutation.isPending
              ? ar ? "جاري التسجيل..." : "Saving..."
              : ar ? "تسجيل قيمة المعمل" : "Record lab cost"}
          </button>

          {canViewLabCosts ? (
            <div className={styles.recentCosts}>
              <div className={styles.subHeader}>
                <strong>{ar ? "آخر قيم المعمل" : "Recent lab costs"}</strong>
                <span>{expensesQuery.data?.length ?? 0}</span>
              </div>

              {expensesQuery.data?.slice(0, 6).map(expense => (
                <article key={expense.id}>
                  <div>
                    <strong>{expense.patientName}</strong>
                    <small>{expense.serviceOrItemName}</small>
                  </div>
                  <b>{expense.amount.toLocaleString()} EGP</b>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.staffPrivacyNote}>
              {ar
                ? "يمكنك إدخال قيمة المعمل، لكن سجل المصروفات والإجماليات المالية يظل مخفيًا عن حساب السكرتيرة والممرضة."
                : "You can enter the lab cost, while historical costs and financial totals stay hidden for secretary/nurse accounts."}
            </div>
          )}
        </form>
      </div>

      <section className={styles.ordersSection}>
        <div className={styles.sectionHeader}>
          <div>
            <p>{ar ? "سجل التشغيل" : "Operational history"}</p>
            <h2>{ar ? "أوامر المعمل الأخيرة" : "Recent lab orders"}</h2>
          </div>
          <span>{ordersQuery.data?.length ?? 0}</span>
        </div>

        <div className={styles.ordersList}>
          {ordersQuery.data?.map(order => (
            <article key={order.id}>
              <div className={styles.orderSerial}>
                <strong>{order.serialNumber}</strong>
                <span>{new Date(order.createdAtUtc).toLocaleDateString(ar ? "ar-EG" : "en-GB")}</span>
              </div>
              <div>
                <strong>{order.patientName}</strong>
                <span>{order.doctorName}</span>
              </div>
              <div>
                <small>{ar ? "نوع العمل" : "Work"}</small>
                <span>{order.workTypes.join(" • ") || "—"}</span>
              </div>
              <div>
                <small>{ar ? "الخامة" : "Material"}</small>
                <span>{order.materialOptions.join(" • ") || "—"}</span>
              </div>
            </article>
          ))}

          {!ordersQuery.isLoading && ordersQuery.data?.length === 0 && (
            <div className={styles.emptyOrders}>
              {ar ? "لا توجد أوامر معمل حتى الآن." : "No lab orders yet."}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
