import {
  useState,
  type FormEvent,
} from "react";
import axios from "axios";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLanguage } from "../../../i18n/LanguageContext";
import type { LabPatientLookup } from "../../../types/operations";
import {
  createQuickLabExpense,
  getLabExpenses,
  lookupLabPatient,
} from "../api/labApi";
import styles from "./LabPage.module.css";

function money(value: number) {
  return new Intl.NumberFormat("ar-EG", {
    maximumFractionDigits: 2,
  }).format(value);
}

function errorMessage(error: unknown, ar: boolean) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return ar
    ? "تعذر تسجيل قيمة المعمل. راجع البيانات وحاول مرة أخرى."
    : "Could not record the lab cost. Please review the data and try again.";
}

export function LabPage() {
  const { language } = useLanguage();
  const ar = language === "ar";
  const client = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] =
    useState<LabPatientLookup | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [notice, setNotice] = useState("");

  const lookupQuery = useQuery({
    queryKey: ["lab-patient-lookup", search],
    queryFn: () => lookupLabPatient(search),
    enabled: !selectedPatient && search.trim().length >= 2,
    staleTime: 10_000,
  });

  const expensesQuery = useQuery({
    queryKey: ["lab-expenses"],
    queryFn: getLabExpenses,
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedPatient) {
        throw new Error("Patient is required");
      }

      return createQuickLabExpense({
        patientId: selectedPatient.patientId,
        description: description.trim() || null,
        amount: Number(amount),
      });
    },
    onMutate: () => setNotice(""),
    onSuccess: async () => {
      setNotice(
        ar
          ? "تم تسجيل قيمة المعمل وخصمها من حساب الطبيب المالي."
          : "Lab cost recorded and included in the doctor's financial totals.",
      );
      setSearch("");
      setSelectedPatient(null);
      setDescription("");
      setAmount("");

      await Promise.all([
        client.invalidateQueries({ queryKey: ["lab-expenses"] }),
        client.invalidateQueries({ queryKey: ["dashboard"] }),
        client.invalidateQueries({ queryKey: ["finance"] }),
      ]);
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();

    if (!selectedPatient || Number(amount) <= 0) {
      return;
    }

    saveMutation.mutate();
  }

  function selectPatient(patient: LabPatientLookup) {
    setSelectedPatient(patient);
    setSearch(patient.fullName);
    setNotice("");
  }

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Laboratory</p>
          <h1>{ar ? "المعمل" : "Laboratory"}</h1>
          <p>
            {ar
              ? "تسجيل مصروف المعمل في ثوانٍ: اختر المريض، اكتب وصفًا لو محتاج، وسجل القيمة."
              : "Record a lab expense in seconds: choose the patient, add an optional description, then enter the amount."}
          </p>
        </div>

        <div className={styles.flowHint}>
          <span>01</span>
          <strong>{ar ? "المريض" : "Patient"}</strong>
          <i />
          <span>02</span>
          <strong>{ar ? "القيمة" : "Amount"}</strong>
        </div>
      </header>

      <div className={styles.layout}>
        <form className={styles.entryCard} onSubmit={submit}>
          <div className={styles.cardHeading}>
            <div>
              <span className={styles.step}>01</span>
            </div>
            <div>
              <h2>{ar ? "تسجيل قيمة معمل" : "Record lab cost"}</h2>
              <p>
                {ar
                  ? "ابدأ بكتابة اسم المريض أو رقم الاستمارة، ثم اختر المريض من النتائج."
                  : "Start typing the patient name or form number, then choose the patient from the results."}
              </p>
            </div>
          </div>

          <label className={styles.field}>
            <span>{ar ? "اسم المريض أو رقم الاستمارة" : "Patient name or form number"}</span>
            <input
              autoComplete="off"
              value={search}
              onChange={event => {
                setSearch(event.target.value);
                if (selectedPatient) {
                  setSelectedPatient(null);
                }
              }}
              placeholder={
                ar
                  ? "مثال: محمد أحمد أو 1025"
                  : "Example: Ahmed Mohamed or 1025"
              }
            />
            <small>
              {ar
                ? "اكتب حرفين على الأقل. يمكنك البحث أيضًا بكود المريض أو رقم الهاتف."
                : "Type at least two characters. Patient code and phone also work."}
            </small>
          </label>

          {!selectedPatient
            && search.trim().length >= 2
            && lookupQuery.data
            && lookupQuery.data.length > 0 && (
              <div className={styles.results}>
                {lookupQuery.data.map(patient => (
                  <button
                    type="button"
                    key={patient.patientId}
                    onClick={() => selectPatient(patient)}
                  >
                    <div>
                      <strong>{patient.fullName}</strong>
                      <span>{patient.phoneNumber}</span>
                    </div>
                    <small>
                      {patient.formNumber
                        ? `${ar ? "استمارة" : "Form"}: ${patient.formNumber}`
                        : patient.patientCode}
                    </small>
                    {patient.isBlacklisted && (
                      <b>{ar ? "بلاك ليست" : "Blacklist"}</b>
                    )}
                  </button>
                ))}
              </div>
            )}

          {!selectedPatient
            && search.trim().length >= 2
            && !lookupQuery.isFetching
            && lookupQuery.data?.length === 0 && (
              <div className={styles.emptySearch}>
                {ar
                  ? "لا يوجد مريض مطابق. تأكد من الاسم أو رقم الاستمارة."
                  : "No matching patient. Check the name or form number."}
              </div>
            )}

          {selectedPatient && (
            <div className={styles.selectedPatient}>
              <div className={styles.avatar}>
                {selectedPatient.fullName.trim().charAt(0)}
              </div>
              <div>
                <strong>{selectedPatient.fullName}</strong>
                <span>
                  {selectedPatient.formNumber
                    ? `${ar ? "استمارة" : "Form"}: ${selectedPatient.formNumber}`
                    : selectedPatient.patientCode}
                  {" • "}
                  {selectedPatient.phoneNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPatient(null);
                  setSearch("");
                }}
              >
                {ar ? "تغيير" : "Change"}
              </button>
            </div>
          )}

          <label className={styles.field}>
            <span>{ar ? "الوصف — اختياري" : "Description — optional"}</span>
            <textarea
              rows={3}
              maxLength={300}
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder={
                ar
                  ? "مثال: تاج زيركون، طقم، إصلاح... ويمكن تركه فارغًا"
                  : "Example: zircon crown, denture, repair... or leave blank"
              }
            />
          </label>

          <label className={styles.field}>
            <span>{ar ? "قيمة المعمل" : "Lab amount"}</span>
            <div className={styles.amountField}>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={event => setAmount(event.target.value)}
                placeholder="0.00"
              />
              <b>EGP</b>
            </div>
          </label>

          {notice && (
            <div className={styles.success}>{notice}</div>
          )}

          {saveMutation.isError && (
            <div className={styles.error}>
              {errorMessage(saveMutation.error, ar)}
            </div>
          )}

          <button
            className={styles.primaryButton}
            disabled={
              !selectedPatient
              || Number(amount) <= 0
              || saveMutation.isPending
            }
          >
            {saveMutation.isPending
              ? (ar ? "جاري التسجيل..." : "Saving...")
              : (ar ? "تسجيل قيمة المعمل" : "Record lab cost")}
          </button>
        </form>

        <section className={styles.historyCard}>
          <div className={styles.historyHeader}>
            <div>
              <p className={styles.eyebrow}>Recent entries</p>
              <h2>{ar ? "آخر تسجيلات المعمل" : "Recent lab entries"}</h2>
            </div>
            <span>{expensesQuery.data?.length ?? 0}</span>
          </div>

          <div className={styles.historyList}>
            {expensesQuery.data?.slice(0, 25).map(expense => (
              <article key={expense.id}>
                <div>
                  <strong>{expense.patientName}</strong>
                  <span>
                    {expense.serviceOrItemName === "Lab expense"
                      ? (ar ? "بدون وصف" : "No description")
                      : expense.serviceOrItemName}
                  </span>
                  <small>
                    {new Date(expense.expenseDateUtc).toLocaleString(
                      ar ? "ar-EG" : "en-GB",
                    )}
                  </small>
                </div>
                <b>{money(expense.amount)} EGP</b>
              </article>
            ))}

            {expensesQuery.isLoading && (
              <div className={styles.state}>
                {ar ? "جاري تحميل التسجيلات..." : "Loading entries..."}
              </div>
            )}

            {!expensesQuery.isLoading
              && expensesQuery.data?.length === 0 && (
                <div className={styles.state}>
                  {ar ? "لا توجد قيم معمل مسجلة حتى الآن." : "No lab costs recorded yet."}
                </div>
              )}
          </div>
        </section>
      </div>
    </section>
  );
}
