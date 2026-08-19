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
import { useLanguage } from "../../../i18n/LanguageContext";
import { ClinicPageHeader } from "../../../components/ui/ClinicPageHeader";
import type { LabPatientLookup } from "../../../types/operations";
import {
  createQuickLabExpense,
  getLabExpenses,
  lookupLabPatient,
  setLabExpensePaymentStatus,
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
    ? "تعذر تنفيذ العملية. راجع البيانات وحاول مرة أخرى."
    : "Could not complete the action. Please review the data and try again.";
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
  const [isPaid, setIsPaid] = useState(false);
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

  const totals = useMemo(() => {
    const rows = expensesQuery.data ?? [];
    return rows.reduce(
      (acc, item) => {
        if (item.isPaid) acc.paid += item.amount;
        else acc.unpaid += item.amount;
        return acc;
      },
      { paid: 0, unpaid: 0 },
    );
  }, [expensesQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedPatient) {
        throw new Error("Patient is required");
      }

      return createQuickLabExpense({
        patientId: selectedPatient.patientId,
        description: description.trim() || null,
        amount: Number(amount),
        isPaid,
      });
    },
    onMutate: () => setNotice(""),
    onSuccess: async () => {
      setNotice(
        isPaid
          ? (ar
              ? "تم تسجيل قيمة المعمل كمدفوعة وتم احتسابها ضمن مصروفات الطبيب."
              : "Lab cost recorded as paid and included in the doctor's expenses.")
          : (ar
              ? "تم تسجيل قيمة المعمل كغير مدفوعة ولن تخصم من الإيراد حتى يتم الدفع."
              : "Lab cost recorded as unpaid and will not reduce revenue until it is paid."),
      );
      setSearch("");
      setSelectedPatient(null);
      setDescription("");
      setAmount("");
      setIsPaid(false);

      await Promise.all([
        client.invalidateQueries({ queryKey: ["lab-expenses"] }),
        client.invalidateQueries({ queryKey: ["dashboard"] }),
        client.invalidateQueries({ queryKey: ["finance"] }),
      ]);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ expenseId, nextPaid }: { expenseId: string; nextPaid: boolean }) =>
      setLabExpensePaymentStatus(expenseId, nextPaid),
    onMutate: () => setNotice(""),
    onSuccess: async (_, variables) => {
      setNotice(
        variables.nextPaid
          ? (ar
              ? "تم تسجيل دفع قيمة المعمل، وتم خصمها ماليًا بتاريخ اليوم."
              : "Lab payment marked as paid and included financially as of today.")
          : (ar
              ? "تم إلغاء حالة الدفع، والقيمة لم تعد مخصومة من الحساب المالي."
              : "Payment status reverted to unpaid and is no longer deducted financially."),
      );

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
      <ClinicPageHeader
        eyebrow="Laboratory"
        title={ar ? "المعمل" : "Laboratory"}
        subtitle={
          ar
            ? "سجل قيمة المعمل وحدد حالة الدفع الفعلية. غير المدفوع لا يُخصم من إيراد الطبيب."
            : "Record the lab cost and its real payment status. Unpaid values do not reduce doctor revenue."
        }
        icon="lab"
        metrics={[
          {
            label: ar ? "مدفوع" : "Paid",
            value: `${money(totals.paid)} EGP`,
            icon: "reports",
            tone: "success",
          },
          {
            label: ar ? "غير مدفوع" : "Unpaid",
            value: `${money(totals.unpaid)} EGP`,
            icon: "warning",
            tone: totals.unpaid > 0 ? "warning" : "success",
          },
          {
            label: ar ? "إجمالي السجلات" : "Total entries",
            value: (expensesQuery.data ?? []).length,
            icon: "lab",
            tone: "primary",
          },
          {
            label: ar ? "عمليات مدفوعة" : "Paid entries",
            value: (expensesQuery.data ?? []).filter(item => item.isPaid).length,
            icon: "debt",
            tone: "neutral",
          },
        ]}
      />

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
                  ? "اختر المريض، أدخل القيمة، ثم حدد حالة الدفع الفعلية."
                  : "Choose the patient, enter the amount, then choose the real payment status."}
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
              placeholder={ar ? "مثال: محمد أحمد أو 1025" : "Example: Ahmed Mohamed or 1025"}
            />
            <small>
              {ar
                ? "اكتب حرفين على الأقل. البحث يعمل أيضًا بكود المريض أو الهاتف."
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
                  ? "مثال: تاج زيركون، طقم، إصلاح..."
                  : "Example: zircon crown, denture, repair..."
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
                placeholder={ar ? "اكتب القيمة" : "Enter amount"}
              />
              <b>EGP</b>
            </div>
          </label>

          <div className={styles.paymentBlock}>
            <span>{ar ? "هل تم دفع قيمة المعمل؟" : "Has the lab cost been paid?"}</span>
            <div className={styles.paymentToggle}>
              <button
                type="button"
                className={isPaid ? styles.paidActive : ""}
                onClick={() => setIsPaid(true)}
              >
                <span>✓</span>
                {ar ? "دفع" : "Paid"}
              </button>
              <button
                type="button"
                className={!isPaid ? styles.unpaidActive : ""}
                onClick={() => setIsPaid(false)}
              >
                <span>○</span>
                {ar ? "لم يدفع" : "Unpaid"}
              </button>
            </div>
            <small>
              {isPaid
                ? (ar
                    ? "سيتم احتساب القيمة كمصروف وخصمها من صافي الطبيب."
                    : "This value will count as an expense and reduce the doctor's net.")
                : (ar
                    ? "لن يتم خصم القيمة من الإيرادات حتى تضغط دفع لاحقًا."
                    : "This value will not reduce revenue until it is marked paid later.")}
            </small>
          </div>

          {notice && (
            <div className={styles.success}>{notice}</div>
          )}

          {(saveMutation.isError || statusMutation.isError) && (
            <div className={styles.error}>
              {errorMessage(saveMutation.error ?? statusMutation.error, ar)}
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
            {expensesQuery.data?.slice(0, 40).map(expense => (
              <article key={expense.id} className={!expense.isPaid ? styles.unpaidRow : ""}>
                <div className={styles.historyInfo}>
                  <div className={styles.historyTitle}>
                    <strong>{expense.patientName}</strong>
                    <span className={expense.isPaid ? styles.paidBadge : styles.unpaidBadge}>
                      {expense.isPaid
                        ? (ar ? "مدفوع" : "Paid")
                        : (ar ? "لم يدفع" : "Unpaid")}
                    </span>
                  </div>
                  <span>
                    {expense.serviceOrItemName === "Lab expense"
                      ? (ar ? "بدون وصف" : "No description")
                      : expense.serviceOrItemName}
                  </span>
                  <small>
                    {ar ? "تسجيل: " : "Recorded: "}
                    {new Date(expense.expenseDateUtc).toLocaleString(
                      ar ? "ar-EG" : "en-GB",
                    )}
                  </small>
                  {expense.paidAtUtc && (
                    <small>
                      {ar ? "دفع: " : "Paid: "}
                      {new Date(expense.paidAtUtc).toLocaleString(
                        ar ? "ar-EG" : "en-GB",
                      )}
                    </small>
                  )}
                </div>

                <div className={styles.historyActions}>
                  <b>{money(expense.amount)} EGP</b>
                  <button
                    type="button"
                    disabled={statusMutation.isPending}
                    className={expense.isPaid ? styles.markUnpaidButton : styles.markPaidButton}
                    onClick={() => statusMutation.mutate({
                      expenseId: expense.id,
                      nextPaid: !expense.isPaid,
                    })}
                  >
                    {expense.isPaid
                      ? (ar ? "إلغاء الدفع" : "Mark unpaid")
                      : (ar ? "تسجيل دفع" : "Mark paid")}
                  </button>
                </div>
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
