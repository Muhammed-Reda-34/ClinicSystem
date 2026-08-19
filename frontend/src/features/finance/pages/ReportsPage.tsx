import { useState, type FormEvent } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { useLanguage } from "../../../i18n/LanguageContext";
import { ClinicPageHeader } from "../../../components/ui/ClinicPageHeader";
import {
  addSalaryAdjustment,
  closePeriod,
  createExpense,
  getAccountingPeriods,
  getExpenses,
  getMonthlyReport,
  getPayroll,
  getSalaryProfiles,
  reopenPeriod,
  setSalaryRate,
} from "../api/financeApi";
import styles from "./ReportsPage.module.css";
import { SimpleDateInput } from "../../../components/forms/SimpleDateInput";

function money(value: number) {
  return new Intl.NumberFormat("ar-EG", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function ReportsPage() {
  const { hasRole } = useAuth();
  const { language } = useLanguage();
  const ar = language === "ar";
  const canManageFinance = hasRole("Owner") || hasRole("Doctor");
  const client = useQueryClient();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [expense, setExpense] = useState({
    category: "",
    description: "",
    amount: 0,
    notes: "",
  });

  const [salaryRate, setSalaryRateForm] = useState({
    userId: "",
    baseSalary: 0,
    effectiveFrom: `${year}-${String(month).padStart(2, "0")}-01`,
  });

  const [adjustment, setAdjustment] = useState({
    userId: "",
    type: 2,
    amount: 0,
    notes: "",
  });

  const reportQuery = useQuery({
    queryKey: ["finance", "monthly", year, month],
    queryFn: () => getMonthlyReport(year, month),
  });

  const expensesQuery = useQuery({
    queryKey: ["finance", "expenses", year, month],
    queryFn: () => getExpenses(year, month),
    enabled: canManageFinance,
  });

  const salaryProfilesQuery = useQuery({
    queryKey: ["finance", "salary-profiles"],
    queryFn: getSalaryProfiles,
    enabled: canManageFinance,
  });

  const payrollQuery = useQuery({
    queryKey: ["finance", "payroll", year, month],
    queryFn: () => getPayroll(year, month),
    enabled: canManageFinance,
  });

  const periodsQuery = useQuery({
    queryKey: ["finance", "periods"],
    queryFn: getAccountingPeriods,
    enabled: canManageFinance,
  });

  const refreshFinance = async () => {
    await client.invalidateQueries({ queryKey: ["finance"] });
    await client.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const expenseMutation = useMutation({
    mutationFn: () =>
      createExpense({
        ...expense,
        amount: Number(expense.amount),
        notes: expense.notes || null,
        expenseDateUtc: new Date(
          year,
          month - 1,
          Math.min(now.getDate(), 28),
          12,
        ).toISOString(),
      }),
    onSuccess: async () => {
      setExpense({
        category: "",
        description: "",
        amount: 0,
        notes: "",
      });
      await refreshFinance();
    },
  });

  const rateMutation = useMutation({
    mutationFn: () =>
      setSalaryRate(
        salaryRate.userId,
        {
          baseSalary: Number(salaryRate.baseSalary),
          effectiveFrom: salaryRate.effectiveFrom,
        },
      ),
    onSuccess: async () => {
      setSalaryRateForm({
        userId: "",
        baseSalary: 0,
        effectiveFrom: `${year}-${String(month).padStart(2, "0")}-01`,
      });
      await refreshFinance();
    },
  });

  const adjustmentMutation = useMutation({
    mutationFn: () =>
      addSalaryAdjustment(
        adjustment.userId,
        {
          year,
          month,
          type: adjustment.type,
          amount: Number(adjustment.amount),
          notes: adjustment.notes || null,
        },
      ),
    onSuccess: async () => {
      setAdjustment({
        userId: "",
        type: 2,
        amount: 0,
        notes: "",
      });
      await refreshFinance();
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => closePeriod(year, month),
    onSuccess: refreshFinance,
  });

  const reopenMutation = useMutation({
    mutationFn: () => reopenPeriod(year, month),
    onSuccess: refreshFinance,
  });

  const currentPeriod =
    periodsQuery.data?.find(
      x => x.year === year && x.month === month,
    ) ?? null;

  const selectedMonthStart =
    new Date(
      year,
      month - 1,
      1,
    );

  const currentMonthStart =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );

  const implicitlyClosed =
    !currentPeriod
    && selectedMonthStart
      < currentMonthStart;

  const isClosed =
    implicitlyClosed
    || currentPeriod?.status === 2
    || currentPeriod?.status === "Closed";

  function submitExpense(event: FormEvent) {
    event.preventDefault();
    expenseMutation.mutate();
  }

  function submitRate(event: FormEvent) {
    event.preventDefault();
    if (!salaryRate.userId) return;
    rateMutation.mutate();
  }

  function submitAdjustment(event: FormEvent) {
    event.preventDefault();
    if (!adjustment.userId) return;
    adjustmentMutation.mutate();
  }

  const report = reportQuery.data;

  return (
    <section className={styles.page}>
      <ClinicPageHeader
        eyebrow="Finance"
        title={ar ? "الحسابات والتقارير" : "Finance & Reports"}
        subtitle={
          ar
            ? "نظرة سريعة على حركة الشهر، ثم التفاصيل والمصروفات والرواتب في نفس الصفحة."
            : "A quick monthly pulse followed by full expenses and payroll details."
        }
        icon="reports"
        badge={isClosed ? (ar ? "الشهر مغلق" : "Month closed") : (ar ? "الشهر مفتوح" : "Month open")}
        actions={
          <div className={styles.monthPicker}>
            <input
              type="number"
              min="2020"
              max="2200"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              aria-label={ar ? "السنة" : "Year"}
            />
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              aria-label={ar ? "الشهر" : "Month"}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map(value => (
                <option key={value} value={value}>
                  {new Intl.DateTimeFormat(
                    ar ? "ar-EG" : "en-US",
                    { month: "long" },
                  ).format(new Date(2026, value - 1, 1))}
                </option>
              ))}
            </select>
          </div>
        }
        metrics={[
          {
            label: ar ? "المحصل" : "Collected",
            value: report ? `${money(report.collectedRevenue)} EGP` : "—",
            icon: "debt",
            tone: "success",
          },
          {
            label: ar ? "متبقي الشهر" : "Outstanding",
            value: report ? `${money(report.outstandingFromMonthVisits)} EGP` : "—",
            icon: "warning",
            tone: report && report.outstandingFromMonthVisits > 0 ? "warning" : "neutral",
          },
          {
            label: ar ? "مصروفات المعمل" : "Lab expenses",
            value: report ? `${money(report.labExpenses)} EGP` : "—",
            icon: "lab",
            tone: "neutral",
          },
          {
            label: ar ? "صافي الحركة" : "Net movement",
            value: report ? `${money(report.netCashMovement)} EGP` : "—",
            icon: "reports",
            tone: report && report.netCashMovement >= 0 ? "primary" : "danger",
          },
        ]}
      />

      {reportQuery.isLoading ? (
        <div className={styles.state}>
          {ar ? "جاري حساب التقرير..." : "Calculating report..."}
        </div>
      ) : report ? (
        <>
          <div className={styles.reportGrid}>
            <article>
              <span>{ar ? "قيمة العلاج المسجل" : "Billed treatment"}</span>
              <strong>{money(report.billedTreatment)} EGP</strong>
            </article>
            <article>
              <span>{ar ? "المبالغ المحصلة" : "Collected revenue"}</span>
              <strong>{money(report.collectedRevenue)} EGP</strong>
            </article>
            <article>
              <span>{ar ? "متبقي زيارات الشهر" : "Outstanding from month"}</span>
              <strong>{money(report.outstandingFromMonthVisits)} EGP</strong>
            </article>
            <article>
              <span>{ar ? "مصروفات المعمل المدفوعة" : "Paid lab expenses"}</span>
              <strong>{money(report.labExpenses)} EGP</strong>
            </article>
            {report.isClinicWide && (
              <>
                <article>
                  <span>{ar ? "مصروفات العيادة" : "Clinic expenses"}</span>
                  <strong>{money(report.manualExpenses)} EGP</strong>
                </article>
                <article>
                  <span>{ar ? "استهلاك المخزون" : "Inventory consumption"}</span>
                  <strong>{money(report.inventoryConsumptionCost)} EGP</strong>
                </article>
                <article>
                  <span>{ar ? "الرواتب" : "Payroll"}</span>
                  <strong>{money(report.payrollCost)} EGP</strong>
                </article>
                <article>
                  <span>{ar ? "إجمالي المصروفات" : "Total expenses"}</span>
                  <strong>{money(report.totalExpenses)} EGP</strong>
                </article>
              </>
            )}
            <article className={styles.netCard}>
              <span>{ar ? "صافي الحركة المالية" : "Net cash movement"}</span>
              <strong>{money(report.netCashMovement)} EGP</strong>
            </article>
          </div>
        </>
      ) : (
        <div className={styles.state}>
          {ar ? "تعذر تحميل التقرير." : "Unable to load report."}
        </div>
      )}

      {canManageFinance && (
        <>
          <section className={styles.periodCard}>
            <div>
              <span>{ar ? "حالة الشهر" : "Month status"}</span>
              <strong>
                {isClosed
                  ? (ar ? "مغلق" : "Closed")
                  : (ar ? "مفتوح" : "Open")}
              </strong>
            </div>

            {isClosed ? (
              <button
                type="button"
                onClick={() => reopenMutation.mutate()}
                disabled={reopenMutation.isPending}
              >
                {ar ? "إعادة فتح الشهر" : "Reopen month"}
              </button>
            ) : (
              <button
                type="button"
                className={styles.dangerButton}
                onClick={() => closeMutation.mutate()}
                disabled={closeMutation.isPending}
              >
                {ar ? "إغلاق الشهر" : "Close month"}
              </button>
            )}
          </section>

          <div className={styles.formsGrid}>
            <form className={styles.card} onSubmit={submitExpense}>
              <h2>{ar ? "إضافة مصروف عيادة" : "Add clinic expense"}</h2>

              <label>
                <span>{ar ? "التصنيف" : "Category"}</span>
                <input
                  required
                  value={expense.category}
                  onChange={e =>
                    setExpense({ ...expense, category: e.target.value })
                  }
                />
              </label>

              <label>
                <span>{ar ? "الوصف" : "Description"}</span>
                <input
                  required
                  value={expense.description}
                  onChange={e =>
                    setExpense({ ...expense, description: e.target.value })
                  }
                />
              </label>

              <label>
                <span>{ar ? "القيمة" : "Amount"}</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={expense.amount}
                  onChange={e =>
                    setExpense({ ...expense, amount: Number(e.target.value) })
                  }
                />
              </label>

              <label>
                <span>{ar ? "ملاحظات" : "Notes"}</span>
                <textarea
                  rows={3}
                  value={expense.notes}
                  onChange={e =>
                    setExpense({ ...expense, notes: e.target.value })
                  }
                />
              </label>

              <button disabled={isClosed || expenseMutation.isPending}>
                {ar ? "حفظ المصروف" : "Save expense"}
              </button>
            </form>

            <form className={styles.card} onSubmit={submitRate}>
              <h2>{ar ? "الراتب الأساسي" : "Base salary"}</h2>

              <label>
                <span>{ar ? "الموظف" : "Employee"}</span>
                <select
                  required
                  value={salaryRate.userId}
                  onChange={e =>
                    setSalaryRateForm({
                      ...salaryRate,
                      userId: e.target.value,
                    })
                  }
                >
                  <option value="">—</option>
                  {salaryProfilesQuery.data?.map(profile => (
                    <option key={profile.userId} value={profile.userId}>
                      {profile.fullName} — {profile.role}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>{ar ? "الراتب" : "Salary"}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={salaryRate.baseSalary}
                  onChange={e =>
                    setSalaryRateForm({
                      ...salaryRate,
                      baseSalary: Number(e.target.value),
                    })
                  }
                />
              </label>

              <label>
                <span>{ar ? "ساري من" : "Effective from"}</span>
                <SimpleDateInput
                  value={salaryRate.effectiveFrom}
                  onChange={value =>
                    setSalaryRateForm({
                      ...salaryRate,
                      effectiveFrom: value,
                    })
                  }
                />
              </label>

              <button disabled={!salaryRate.userId || rateMutation.isPending}>
                {ar ? "حفظ راتب جديد" : "Save salary rate"}
              </button>
            </form>

            <form className={styles.card} onSubmit={submitAdjustment}>
              <h2>{ar ? "زيادة / حافز / خصم" : "Salary adjustment"}</h2>

              <label>
                <span>{ar ? "الموظف" : "Employee"}</span>
                <select
                  required
                  value={adjustment.userId}
                  onChange={e =>
                    setAdjustment({
                      ...adjustment,
                      userId: e.target.value,
                    })
                  }
                >
                  <option value="">—</option>
                  {salaryProfilesQuery.data?.map(profile => (
                    <option key={profile.userId} value={profile.userId}>
                      {profile.fullName}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>{ar ? "النوع" : "Type"}</span>
                <select
                  value={adjustment.type}
                  onChange={e =>
                    setAdjustment({
                      ...adjustment,
                      type: Number(e.target.value),
                    })
                  }
                >
                  <option value={1}>{ar ? "زيادة" : "Increase"}</option>
                  <option value={2}>{ar ? "حافز" : "Bonus"}</option>
                  <option value={3}>{ar ? "خصم" : "Deduction"}</option>
                </select>
              </label>

              <label>
                <span>{ar ? "القيمة" : "Amount"}</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={adjustment.amount}
                  onChange={e =>
                    setAdjustment({
                      ...adjustment,
                      amount: Number(e.target.value),
                    })
                  }
                />
              </label>

              <label>
                <span>{ar ? "ملاحظات" : "Notes"}</span>
                <textarea
                  rows={3}
                  value={adjustment.notes}
                  onChange={e =>
                    setAdjustment({
                      ...adjustment,
                      notes: e.target.value,
                    })
                  }
                />
              </label>

              <button
                disabled={
                  isClosed
                  || !adjustment.userId
                  || adjustmentMutation.isPending
                }
              >
                {ar ? "إضافة التعديل" : "Add adjustment"}
              </button>
            </form>
          </div>

          <div className={styles.tablesGrid}>
            <section className={styles.card}>
              <h2>{ar ? "مصروفات الشهر" : "Monthly expenses"}</h2>
              <div className={styles.rows}>
                {expensesQuery.data?.map(item => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.description}</strong>
                      <small>{item.category}</small>
                    </div>
                    <span>{money(item.amount)} EGP</span>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.card}>
              <h2>{ar ? "كشف الرواتب" : "Payroll"}</h2>
              <div className={styles.rows}>
                {payrollQuery.data?.map(row => (
                  <article key={row.userId}>
                    <div>
                      <strong>{row.fullName}</strong>
                      <small>
                        {ar ? "أساسي" : "Base"}: {money(row.baseSalary)}
                        {" • "}
                        {ar ? "خصم" : "Deduct"}: {money(row.deductions)}
                      </small>
                    </div>
                    <span>{money(row.netSalary)} EGP</span>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  );
}
