import {
  useMemo,
  useRef,
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
import type {
  LabExpense,
  LabPatientLookup,
} from "../../../types/operations";
import {
  createQuickLabExpense,
  deleteLabExpense,
  getLabExpenses,
  lookupLabPatient,
  setLabExpensePaymentStatus,
  updateLabExpense,
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

function initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "P";
  }

  return parts
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join("")
    .toUpperCase();
}

function Icon({
  name,
  size = 18,
}: {
  name:
    | "lab"
    | "wallet"
    | "clock"
    | "receipt"
    | "search"
    | "user"
    | "check"
    | "edit"
    | "trash"
    | "close"
    | "save"
    | "chevron"
    | "shield"
    | "alert";
  size?: number;
}) {
  const paths = {
    lab: (
      <>
        <path d="M9 3v5.2l-4.4 7.4A3.5 3.5 0 0 0 7.6 21h8.8a3.5 3.5 0 0 0 3-5.4L15 8.2V3" />
        <path d="M8 3h8" />
        <path d="M7.5 14h9" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18v16H6.5A2.5 2.5 0 0 1 4 17.5z" />
        <path d="M4 8h14" />
        <path d="M14 12h6v5h-6a2.5 2.5 0 0 1 0-5Z" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </>
    ),
    check: (
      <path d="m5 12 4 4L19 6" />
    ),
    edit: (
      <>
        <path d="M4 20h4l11-11-4-4L4 16z" />
        <path d="m13.5 6.5 4 4" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" />
        <path d="M10 11v6M14 11v6" />
      </>
    ),
    close: (
      <path d="m6 6 12 12M18 6 6 18" />
    ),
    save: (
      <>
        <path d="M5 4h12l2 2v14H5z" />
        <path d="M8 4v6h8V4M8 20v-6h8v6" />
      </>
    ),
    chevron: (
      <path d="m9 6 6 6-6 6" />
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.8 2.8 8 7 10 4.2-2 7-5.2 7-10V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    alert: (
      <>
        <path d="M12 4 3 20h18z" />
        <path d="M12 9v5M12 17h.01" />
      </>
    ),
  };

  return (
    <svg
      className={styles.icon}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function LabPage() {
  const { language } = useLanguage();
  const ar = language === "ar";
  const client = useQueryClient();
  const entryCardRef = useRef<HTMLFormElement | null>(null);

  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] =
    useState<LabPatientLookup | null>(null);
  const [editingExpense, setEditingExpense] =
    useState<LabExpense | null>(null);
  const [deleteCandidate, setDeleteCandidate] =
    useState<LabExpense | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [notice, setNotice] = useState("");

  const lookupQuery = useQuery({
    queryKey: ["lab-patient-lookup", search],
    queryFn: () => lookupLabPatient(search),
    enabled:
      !editingExpense
      && !selectedPatient
      && search.trim().length >= 2,
    staleTime: 10_000,
  });

  const expensesQuery = useQuery({
    queryKey: ["lab-expenses"],
    queryFn: getLabExpenses,
  });

  const rows = expensesQuery.data ?? [];

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, item) => {
        if (item.isPaid) {
          acc.paid += item.amount;
          acc.paidCount += 1;
        } else {
          acc.unpaid += item.amount;
          acc.unpaidCount += 1;
        }

        return acc;
      },
      {
        paid: 0,
        unpaid: 0,
        paidCount: 0,
        unpaidCount: 0,
      },
    );
  }, [rows]);

  async function refreshLabData() {
    await Promise.all([
      client.invalidateQueries({
        queryKey: ["lab-expenses"],
      }),
      client.invalidateQueries({
        queryKey: ["dashboard"],
      }),
      client.invalidateQueries({
        queryKey: ["finance"],
      }),
    ]);
  }

  function resetEditor() {
    setSearch("");
    setSelectedPatient(null);
    setEditingExpense(null);
    setDescription("");
    setAmount("");
    setIsPaid(false);
  }

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
              ? "تم تسجيل قيمة المعمل كمدفوعة وإضافتها إلى المصروفات."
              : "Lab cost recorded as paid and added to expenses.")
          : (ar
              ? "تم تسجيل قيمة المعمل كغير مدفوعة ولن تؤثر على الحسابات حتى يتم الدفع."
              : "Lab cost recorded as unpaid and will not affect financial totals until paid."),
      );

      resetEditor();
      await refreshLabData();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      expenseId: string;
      description: string | null;
      amount: number;
      isPaid: boolean;
    }) =>
      updateLabExpense(
        payload.expenseId,
        {
          description: payload.description,
          amount: payload.amount,
          isPaid: payload.isPaid,
        },
      ),
    onMutate: () => setNotice(""),
    onSuccess: async () => {
      setNotice(
        ar
          ? "تم تحديث تسجيل المعمل بنجاح."
          : "Lab record updated successfully.",
      );
      resetEditor();
      await refreshLabData();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      expenseId,
      nextPaid,
    }: {
      expenseId: string;
      nextPaid: boolean;
    }) =>
      setLabExpensePaymentStatus(
        expenseId,
        nextPaid,
      ),
    onMutate: () => setNotice(""),
    onSuccess: async (_, variables) => {
      setNotice(
        variables.nextPaid
          ? (ar
              ? "تم تسجيل الدفع واحتساب القيمة ماليًا بتاريخ اليوم."
              : "Payment marked as paid and included financially as of today.")
          : (ar
              ? "تم إلغاء حالة الدفع ولم تعد القيمة مخصومة من الحساب المالي."
              : "Payment reverted to unpaid and is no longer deducted financially."),
      );

      await refreshLabData();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (expenseId: string) =>
      deleteLabExpense(expenseId),
    onMutate: () => setNotice(""),
    onSuccess: async (_, expenseId) => {
      if (editingExpense?.id === expenseId) {
        resetEditor();
      }

      setDeleteCandidate(null);
      setNotice(
        ar
          ? "تم حذف تسجيل المعمل."
          : "Lab record deleted.",
      );
      await refreshLabData();
    },
  });

  const mutationError =
    saveMutation.error
    ?? updateMutation.error
    ?? statusMutation.error
    ?? deleteMutation.error;

  const hasMutationError =
    saveMutation.isError
    || updateMutation.isError
    || statusMutation.isError
    || deleteMutation.isError;

  const editorBusy =
    saveMutation.isPending
    || updateMutation.isPending;

  const rowActionBusy =
    statusMutation.isPending
    || deleteMutation.isPending;

  function submit(event: FormEvent) {
    event.preventDefault();

    if (Number(amount) <= 0) {
      return;
    }

    if (editingExpense) {
      updateMutation.mutate({
        expenseId: editingExpense.id,
        description:
          description.trim() || null,
        amount: Number(amount),
        isPaid,
      });
      return;
    }

    if (!selectedPatient) {
      return;
    }

    saveMutation.mutate();
  }

  function selectPatient(
    patient: LabPatientLookup,
  ) {
    setSelectedPatient(patient);
    setSearch(patient.fullName);
    setNotice("");
  }

  function beginEdit(expense: LabExpense) {
    setEditingExpense(expense);
    setSelectedPatient(null);
    setSearch("");
    setDescription(
      expense.serviceOrItemName === "Lab expense"
        ? ""
        : expense.serviceOrItemName,
    );
    setAmount(String(expense.amount));
    setIsPaid(expense.isPaid);
    setNotice("");

    requestAnimationFrame(() => {
      entryCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function cancelEdit() {
    resetEditor();
    setNotice("");
  }

  return (
    <section
      className={styles.page}
      dir={ar ? "rtl" : "ltr"}
    >
      <header className={styles.pageHeader}>
        <div className={styles.headerCopy}>
          <div className={styles.kicker}>
            <span className={styles.kickerIcon}>
              <Icon name="lab" size={16} />
            </span>
            <span>
              {ar
                ? "إدارة تكاليف المعمل"
                : "Laboratory expenses"}
            </span>
          </div>

          <h1>{ar ? "المعمل" : "Laboratory"}</h1>

          <p>
            {ar
              ? "سجل تكاليف المعمل واربطها بالمريض، ثم راجع حالة الدفع وعدّل السجل عند الحاجة بدون التأثير على دقة الحسابات."
              : "Record lab costs against each patient, track payment status and safely maintain every entry without compromising financial accuracy."}
          </p>
        </div>

        <div className={styles.headerStatus}>
          <span className={styles.liveDot} />
          <div>
            <strong>
              {ar
                ? "الحسابات متزامنة"
                : "Finance synced"}
            </strong>
            <small>
              {ar
                ? "المدفوع فقط يؤثر على التقارير"
                : "Only paid costs affect reports"}
            </small>
          </div>
        </div>
      </header>

      <div className={styles.metricsGrid}>
        <article className={styles.metric}>
          <span className={`${styles.metricIcon} ${styles.metricPaid}`}>
            <Icon name="wallet" />
          </span>
          <div>
            <small>
              {ar
                ? "إجمالي المدفوع"
                : "Total paid"}
            </small>
            <strong>
              {money(totals.paid)}
              <em>EGP</em>
            </strong>
          </div>
        </article>

        <article className={styles.metric}>
          <span className={`${styles.metricIcon} ${styles.metricPending}`}>
            <Icon name="clock" />
          </span>
          <div>
            <small>
              {ar
                ? "في انتظار الدفع"
                : "Awaiting payment"}
            </small>
            <strong>
              {money(totals.unpaid)}
              <em>EGP</em>
            </strong>
          </div>
        </article>

        <article className={styles.metric}>
          <span className={`${styles.metricIcon} ${styles.metricEntries}`}>
            <Icon name="receipt" />
          </span>
          <div>
            <small>
              {ar
                ? "إجمالي التسجيلات"
                : "Total records"}
            </small>
            <strong>
              {rows.length}
              <em>
                {ar ? "سجل" : "records"}
              </em>
            </strong>
          </div>
        </article>

        <article className={styles.metric}>
          <span className={`${styles.metricIcon} ${styles.metricAlert}`}>
            <Icon name="alert" />
          </span>
          <div>
            <small>
              {ar
                ? "غير مدفوعة"
                : "Unpaid records"}
            </small>
            <strong>
              {totals.unpaidCount}
              <em>
                {ar ? "سجل" : "records"}
              </em>
            </strong>
          </div>
        </article>
      </div>

      {notice && (
        <div className={styles.notice}>
          <span>
            <Icon name="check" size={16} />
          </span>
          <strong>{notice}</strong>
        </div>
      )}

      {hasMutationError && (
        <div className={styles.errorBanner}>
          <span>
            <Icon name="alert" size={17} />
          </span>
          <div>
            <strong>
              {ar
                ? "لم تكتمل العملية"
                : "Action not completed"}
            </strong>
            <p>
              {errorMessage(
                mutationError,
                ar,
              )}
            </p>
          </div>
        </div>
      )}

      <div className={styles.workspace}>
        <form
          ref={entryCardRef}
          className={[
            styles.editorCard,
            editingExpense
              ? styles.editorCardEditing
              : "",
          ].join(" ")}
          onSubmit={submit}
        >
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderIcon}>
              <Icon
                name={
                  editingExpense
                    ? "edit"
                    : "lab"
                }
              />
            </div>

            <div className={styles.cardHeaderText}>
              <span>
                {editingExpense
                  ? (ar
                      ? "وضع التعديل"
                      : "Edit mode")
                  : (ar
                      ? "تسجيل جديد"
                      : "New record")}
              </span>

              <h2>
                {editingExpense
                  ? (ar
                      ? "تعديل تسجيل المعمل"
                      : "Edit lab record")
                  : (ar
                      ? "إضافة تكلفة معمل"
                      : "Add lab cost")}
              </h2>

              <p>
                {editingExpense
                  ? (ar
                      ? "يمكنك تعديل الوصف والقيمة وحالة الدفع. المريض لا يتغير داخل السجل."
                      : "Update the description, amount or payment status. The patient remains fixed for this record.")
                  : (ar
                      ? "ابحث عن المريض ثم أدخل تفاصيل التكلفة وحالة الدفع."
                      : "Find the patient, then enter the cost details and payment status.")}
              </p>
            </div>

            {editingExpense && (
              <button
                type="button"
                className={styles.closeEditButton}
                onClick={cancelEdit}
                aria-label={
                  ar
                    ? "إلغاء التعديل"
                    : "Cancel edit"
                }
              >
                <Icon name="close" size={17} />
              </button>
            )}
          </div>

          {editingExpense ? (
            <div className={styles.editingPatient}>
              <div className={styles.patientAvatar}>
                {initials(
                  editingExpense.patientName,
                )}
              </div>

              <div className={styles.patientDetails}>
                <small>
                  {ar
                    ? "المريض المرتبط بالسجل"
                    : "Patient linked to record"}
                </small>
                <strong>
                  {editingExpense.patientName}
                </strong>
                <span>
                  {editingExpense.patientCode}
                  {" · "}
                  {editingExpense.doctorName}
                </span>
              </div>

              <span className={styles.lockedBadge}>
                <Icon name="shield" size={14} />
                {ar ? "ثابت" : "Locked"}
              </span>
            </div>
          ) : (
            <>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  {ar
                    ? "البحث عن المريض"
                    : "Find patient"}
                </span>

                <div className={styles.inputShell}>
                  <span className={styles.inputIcon}>
                    <Icon
                      name="search"
                      size={17}
                    />
                  </span>
                  <input
                    autoComplete="off"
                    value={search}
                    onChange={event => {
                      setSearch(
                        event.target.value,
                      );

                      if (selectedPatient) {
                        setSelectedPatient(
                          null,
                        );
                      }
                    }}
                    placeholder={
                      ar
                        ? "الاسم، كود المريض، الهاتف أو رقم الاستمارة"
                        : "Name, patient code, phone or form number"
                    }
                  />
                </div>

                <small>
                  {ar
                    ? "ابدأ بكتابة حرفين على الأقل."
                    : "Start with at least two characters."}
                </small>
              </label>

              {!selectedPatient
                && search.trim().length >= 2
                && lookupQuery.isFetching && (
                  <div className={styles.searchLoading}>
                    <span className={styles.spinner} />
                    {ar
                      ? "جاري البحث..."
                      : "Searching..."}
                  </div>
                )}

              {!selectedPatient
                && search.trim().length >= 2
                && lookupQuery.data
                && lookupQuery.data.length > 0 && (
                  <div className={styles.searchResults}>
                    {lookupQuery.data.map(
                      patient => (
                        <button
                          type="button"
                          key={
                            patient.patientId
                          }
                          onClick={() =>
                            selectPatient(
                              patient,
                            )
                          }
                        >
                          <span
                            className={
                              styles.resultAvatar
                            }
                          >
                            {initials(
                              patient.fullName,
                            )}
                          </span>

                          <span
                            className={
                              styles.resultMain
                            }
                          >
                            <strong>
                              {
                                patient.fullName
                              }
                            </strong>
                            <small>
                              {
                                patient.phoneNumber
                              }
                            </small>
                          </span>

                          <span
                            className={
                              styles.resultMeta
                            }
                          >
                            {patient.formNumber
                              ? `${ar ? "استمارة" : "Form"} ${patient.formNumber}`
                              : patient.patientCode}
                          </span>

                          {patient.isBlacklisted && (
                            <span
                              className={
                                styles.blacklistBadge
                              }
                            >
                              {ar
                                ? "بلاك ليست"
                                : "Blacklist"}
                            </span>
                          )}

                          <span
                            className={
                              styles.resultArrow
                            }
                          >
                            <Icon
                              name="chevron"
                              size={16}
                            />
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                )}

              {!selectedPatient
                && search.trim().length >= 2
                && !lookupQuery.isFetching
                && lookupQuery.data?.length === 0 && (
                  <div className={styles.emptySearch}>
                    <Icon
                      name="user"
                      size={20}
                    />
                    <div>
                      <strong>
                        {ar
                          ? "لا يوجد مريض مطابق"
                          : "No matching patient"}
                      </strong>
                      <span>
                        {ar
                          ? "راجع الاسم أو رقم الهاتف أو الاستمارة."
                          : "Check the name, phone or form number."}
                      </span>
                    </div>
                  </div>
                )}

              {selectedPatient && (
                <div className={styles.selectedPatient}>
                  <div className={styles.patientAvatar}>
                    {initials(
                      selectedPatient.fullName,
                    )}
                  </div>

                  <div className={styles.patientDetails}>
                    <small>
                      {ar
                        ? "المريض المختار"
                        : "Selected patient"}
                    </small>
                    <strong>
                      {
                        selectedPatient.fullName
                      }
                    </strong>
                    <span>
                      {selectedPatient.formNumber
                        ? `${ar ? "استمارة" : "Form"} ${selectedPatient.formNumber}`
                        : selectedPatient.patientCode}
                      {" · "}
                      {
                        selectedPatient.phoneNumber
                      }
                    </span>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.changePatientButton
                    }
                    onClick={() => {
                      setSelectedPatient(
                        null,
                      );
                      setSearch("");
                    }}
                  >
                    {ar
                      ? "تغيير"
                      : "Change"}
                  </button>
                </div>
              )}
            </>
          )}

          <div className={styles.formDivider} />

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {ar
                ? "وصف شغل المعمل"
                : "Lab work description"}
              <em>
                {ar
                  ? "اختياري"
                  : "Optional"}
              </em>
            </span>

            <textarea
              rows={3}
              maxLength={300}
              value={description}
              onChange={event =>
                setDescription(
                  event.target.value,
                )
              }
              placeholder={
                ar
                  ? "مثال: تاج زيركون، طقم، إصلاح..."
                  : "Example: zircon crown, denture, repair..."
              }
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              {ar
                ? "قيمة المعمل"
                : "Lab amount"}
            </span>

            <div className={styles.amountInput}>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={event =>
                  setAmount(
                    event.target.value,
                  )
                }
                placeholder="0.00"
              />
              <span>EGP</span>
            </div>
          </label>

          <div className={styles.paymentSection}>
            <div className={styles.paymentHeading}>
              <div>
                <span>
                  {ar
                    ? "حالة الدفع"
                    : "Payment status"}
                </span>
                <small>
                  {ar
                    ? "حدد الحالة الفعلية الآن"
                    : "Choose the current real status"}
                </small>
              </div>
            </div>

            <div className={styles.paymentToggle}>
              <button
                type="button"
                className={
                  isPaid
                    ? styles.paymentPaidActive
                    : ""
                }
                onClick={() =>
                  setIsPaid(true)
                }
              >
                <span>
                  <Icon
                    name="check"
                    size={16}
                  />
                </span>
                <div>
                  <strong>
                    {ar
                      ? "مدفوع"
                      : "Paid"}
                  </strong>
                  <small>
                    {ar
                      ? "يظهر في المصروفات"
                      : "Counts in expenses"}
                  </small>
                </div>
              </button>

              <button
                type="button"
                className={
                  !isPaid
                    ? styles.paymentUnpaidActive
                    : ""
                }
                onClick={() =>
                  setIsPaid(false)
                }
              >
                <span>
                  <Icon
                    name="clock"
                    size={16}
                  />
                </span>
                <div>
                  <strong>
                    {ar
                      ? "غير مدفوع"
                      : "Unpaid"}
                  </strong>
                  <small>
                    {ar
                      ? "لا يؤثر ماليًا"
                      : "No financial impact"}
                  </small>
                </div>
              </button>
            </div>

            <p className={styles.paymentHint}>
              {isPaid
                ? (ar
                    ? "سيتم احتساب القيمة ضمن مصروفات الطبيب. عند تعديل تسجيل مدفوع، يطبق النظام قواعد الفترة المحاسبية."
                    : "The value is included in the doctor's expenses. Editing a paid record remains subject to accounting-period rules.")
                : (ar
                    ? "القيمة محفوظة للمتابعة فقط ولن تخصم من الإيراد حتى يتم تسجيل الدفع."
                    : "The value is tracked only and will not reduce revenue until payment is recorded.")}
            </p>
          </div>

          <div className={styles.formActions}>
            {editingExpense && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={cancelEdit}
                disabled={editorBusy}
              >
                {ar
                  ? "إلغاء"
                  : "Cancel"}
              </button>
            )}

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={
                Number(amount) <= 0
                || editorBusy
                || (
                  !editingExpense
                  && !selectedPatient
                )
              }
            >
              {editorBusy ? (
                <>
                  <span className={styles.buttonSpinner} />
                  {ar
                    ? "جاري الحفظ"
                    : "Saving"}
                </>
              ) : (
                <>
                  <Icon
                    name={
                      editingExpense
                        ? "save"
                        : "lab"
                    }
                    size={17}
                  />
                  {editingExpense
                    ? (ar
                        ? "حفظ التعديلات"
                        : "Save changes")
                    : (ar
                        ? "تسجيل قيمة المعمل"
                        : "Record lab cost")}
                </>
              )}
            </button>
          </div>
        </form>

        <section className={styles.historyCard}>
          <div className={styles.historyHeader}>
            <div>
              <span className={styles.sectionLabel}>
                {ar
                  ? "السجل"
                  : "Activity"}
              </span>
              <h2>
                {ar
                  ? "تسجيلات المعمل"
                  : "Lab records"}
              </h2>
              <p>
                {ar
                  ? "راجع آخر التسجيلات وحالة الدفع وعدّل أي سجل عند الحاجة."
                  : "Review recent entries, payment status and maintain any record when needed."}
              </p>
            </div>

            <div className={styles.historyCount}>
              <strong>
                {rows.length}
              </strong>
              <span>
                {ar ? "سجل" : "records"}
              </span>
            </div>
          </div>

          <div className={styles.listLegend}>
            <span>
              {ar
                ? "المريض والتفاصيل"
                : "Patient & details"}
            </span>
            <span>
              {ar
                ? "القيمة والإجراءات"
                : "Amount & actions"}
            </span>
          </div>

          <div className={styles.historyList}>
            {rows
              .slice(0, 40)
              .map(expense => (
                <article
                  key={expense.id}
                  className={[
                    styles.historyRow,
                    !expense.isPaid
                      ? styles.historyRowUnpaid
                      : "",
                    editingExpense?.id
                      === expense.id
                      ? styles.historyRowEditing
                      : "",
                  ].join(" ")}
                >
                  <div className={styles.historyPatient}>
                    <div className={styles.rowAvatar}>
                      {initials(
                        expense.patientName,
                      )}
                    </div>

                    <div className={styles.historyInfo}>
                      <div className={styles.historyNameLine}>
                        <strong>
                          {expense.patientName}
                        </strong>

                        <span
                          className={
                            expense.isPaid
                              ? styles.paidBadge
                              : styles.unpaidBadge
                          }
                        >
                          <span />
                          {expense.isPaid
                            ? (ar
                                ? "مدفوع"
                                : "Paid")
                            : (ar
                                ? "غير مدفوع"
                                : "Unpaid")}
                        </span>
                      </div>

                      <p>
                        {expense.serviceOrItemName
                          === "Lab expense"
                          ? (ar
                              ? "بدون وصف"
                              : "No description")
                          : expense.serviceOrItemName}
                      </p>

                      <div className={styles.historyMeta}>
                        <span>
                          {
                            expense.patientCode
                          }
                        </span>
                        <i />
                        <span>
                          {expense.doctorName}
                        </span>
                        <i />
                        <span>
                          {new Date(
                            expense.expenseDateUtc,
                          ).toLocaleDateString(
                            ar
                              ? "ar-EG"
                              : "en-GB",
                          )}
                        </span>
                      </div>

                      {expense.paidAtUtc && (
                        <small className={styles.paidTime}>
                          {ar
                            ? "تاريخ الدفع: "
                            : "Paid on: "}
                          {new Date(
                            expense.paidAtUtc,
                          ).toLocaleString(
                            ar
                              ? "ar-EG"
                              : "en-GB",
                          )}
                        </small>
                      )}
                    </div>
                  </div>

                  <div className={styles.historySide}>
                    <div className={styles.rowAmount}>
                      <strong>
                        {money(
                          expense.amount,
                        )}
                      </strong>
                      <span>EGP</span>
                    </div>

                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={
                          styles.paymentAction
                        }
                        disabled={
                          rowActionBusy
                        }
                        onClick={() =>
                          statusMutation.mutate(
                            {
                              expenseId:
                                expense.id,
                              nextPaid:
                                !expense.isPaid,
                            },
                          )
                        }
                      >
                        {expense.isPaid
                          ? (ar
                              ? "إلغاء الدفع"
                              : "Mark unpaid")
                          : (ar
                              ? "تسجيل دفع"
                              : "Mark paid")}
                      </button>

                      <button
                        type="button"
                        className={
                          styles.iconAction
                        }
                        disabled={
                          rowActionBusy
                        }
                        onClick={() =>
                          beginEdit(expense)
                        }
                        title={
                          ar
                            ? "تعديل التسجيل"
                            : "Edit record"
                        }
                        aria-label={
                          ar
                            ? "تعديل التسجيل"
                            : "Edit record"
                        }
                      >
                        <Icon
                          name="edit"
                          size={16}
                        />
                      </button>

                      <button
                        type="button"
                        className={`${styles.iconAction} ${styles.deleteAction}`}
                        disabled={
                          rowActionBusy
                        }
                        onClick={() => {
                          setDeleteCandidate(
                            expense,
                          );
                          setNotice("");
                        }}
                        title={
                          ar
                            ? "حذف التسجيل"
                            : "Delete record"
                        }
                        aria-label={
                          ar
                            ? "حذف التسجيل"
                            : "Delete record"
                        }
                      >
                        <Icon
                          name="trash"
                          size={16}
                        />
                      </button>
                    </div>
                  </div>
                </article>
              ))}

            {expensesQuery.isLoading && (
              <div className={styles.listState}>
                <span className={styles.spinner} />
                <strong>
                  {ar
                    ? "جاري تحميل التسجيلات"
                    : "Loading lab records"}
                </strong>
              </div>
            )}

            {!expensesQuery.isLoading
              && rows.length === 0 && (
                <div className={styles.listState}>
                  <span className={styles.emptyStateIcon}>
                    <Icon
                      name="receipt"
                      size={22}
                    />
                  </span>
                  <strong>
                    {ar
                      ? "لا توجد تسجيلات حتى الآن"
                      : "No lab records yet"}
                  </strong>
                  <p>
                    {ar
                      ? "ابدأ باختيار مريض وتسجيل أول تكلفة معمل."
                      : "Choose a patient and record the first lab cost."}
                  </p>
                </div>
              )}
          </div>
        </section>
      </div>

      {deleteCandidate && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={event => {
            if (
              event.target
              === event.currentTarget
              && !deleteMutation.isPending
            ) {
              setDeleteCandidate(null);
            }
          }}
        >
          <div
            className={styles.confirmDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lab-delete-title"
          >
            <div className={styles.dialogIcon}>
              <Icon
                name="trash"
                size={21}
              />
            </div>

            <div className={styles.dialogCopy}>
              <span>
                {ar
                  ? "تأكيد الحذف"
                  : "Confirm deletion"}
              </span>

              <h3 id="lab-delete-title">
                {ar
                  ? "حذف تسجيل المعمل؟"
                  : "Delete this lab record?"}
              </h3>

              <p>
                {ar
                  ? `سيتم حذف تسجيل ${deleteCandidate.patientName} بقيمة ${money(deleteCandidate.amount)} EGP. هذا يحذف تسجيل المعمل فقط ولا يحذف ملف المريض.`
                  : `This will delete ${deleteCandidate.patientName}'s lab record for ${money(deleteCandidate.amount)} EGP. It removes the lab record only, not the patient profile.`}
              </p>

              {deleteCandidate.isPaid && (
                <div className={styles.dialogWarning}>
                  <Icon
                    name="shield"
                    size={16}
                  />
                  <span>
                    {ar
                      ? "لأن السجل مدفوع، سيمنع النظام الحذف إذا كانت الفترة المحاسبية الخاصة بالدفع مقفلة."
                      : "Because this record is paid, deletion is blocked if its accounting period is closed."}
                  </span>
                </div>
              )}
            </div>

            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.dialogCancel}
                disabled={
                  deleteMutation.isPending
                }
                onClick={() =>
                  setDeleteCandidate(null)
                }
              >
                {ar ? "إلغاء" : "Cancel"}
              </button>

              <button
                type="button"
                className={styles.dialogDelete}
                disabled={
                  deleteMutation.isPending
                }
                onClick={() =>
                  deleteMutation.mutate(
                    deleteCandidate.id,
                  )
                }
              >
                {deleteMutation.isPending ? (
                  <>
                    <span className={styles.buttonSpinner} />
                    {ar
                      ? "جاري الحذف"
                      : "Deleting"}
                  </>
                ) : (
                  <>
                    <Icon
                      name="trash"
                      size={16}
                    />
                    {ar
                      ? "حذف التسجيل"
                      : "Delete record"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
