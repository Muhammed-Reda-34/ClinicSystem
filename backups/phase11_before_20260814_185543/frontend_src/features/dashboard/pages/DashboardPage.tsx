import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useDoctorContext } from "../../context/DoctorContext";
import { useLanguage } from "../../../i18n/LanguageContext";
import { getDashboard } from "../api/dashboardApi";
import { DoctorAvatar } from "../../profile/components/DoctorAvatar";
import styles from "./DashboardPage.module.css";

function money(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("ar-EG", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function DashboardPage() {
  const { user } = useAuth();
  const { selectedDoctor } = useDoctorContext();
  const { language } = useLanguage();

  const query = useQuery({
    queryKey: [
      "dashboard",
      selectedDoctor?.doctorId ?? "all",
    ],
    queryFn: getDashboard,
    staleTime: 30_000,
  });

  const data = query.data;

  const labels =
    language === "ar"
      ? {
          title: "لوحة التحكم",
          subtitle: "ملخص حي لحركة العيادة اليوم والشهر الحالي.",
          patients: "إجمالي المرضى",
          appointments: "مواعيد اليوم",
          noShows: "لم يحضر اليوم",
          followUps: "متابعات اليوم",
          lowStock: "أصناف قاربت على النفاد",
          todayLab: "مصروف المعمل اليوم",
          monthLab: "مصروف المعمل هذا الشهر",
          revenue: "المحصل هذا الشهر",
          expenses: "المصروفات هذا الشهر",
          net: "صافي الحركة",
          debts: "إجمالي المبالغ المستحقة",
          operations: "اختصارات العمل",
          newPatient: "تسجيل مريض",
          appointmentsLink: "المواعيد",
          inventoryLink: "الجرد",
          reportLink: "التقرير الشهري",
        }
      : {
          title: "Dashboard",
          subtitle: "Live clinic summary for today and the current month.",
          patients: "Total patients",
          appointments: "Today's appointments",
          noShows: "No-shows today",
          followUps: "Today's follow-ups",
          lowStock: "Low-stock items",
          todayLab: "Today's lab expenses",
          monthLab: "Lab expenses this month",
          revenue: "Collected this month",
          expenses: "Expenses this month",
          net: "Net cash movement",
          debts: "Outstanding balances",
          operations: "Quick actions",
          newPatient: "Register patient",
          appointmentsLink: "Appointments",
          inventoryLink: "Inventory",
          reportLink: "Monthly report",
        };

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>Blue Dahab</p>
          <h1>{labels.title}</h1>
          <p>{labels.subtitle}</p>
          <small>
            {selectedDoctor?.fullName
              ?? (language === "ar" ? "كل الأطباء" : "All doctors")}
          </small>
        </div>

        <div className={styles.userBlock}>
          <DoctorAvatar size="medium" />

          <div>
            <span>{language === "ar" ? "مرحبًا" : "Welcome"}</span>
            <strong>{user?.fullName}</strong>
          </div>
        </div>
      </header>

      {query.isLoading ? (
        <div className={styles.state}>
          {language === "ar" ? "جاري تحميل المؤشرات..." : "Loading dashboard..."}
        </div>
      ) : query.isError || !data ? (
        <div className={styles.state}>
          {language === "ar" ? "تعذر تحميل لوحة التحكم." : "Unable to load dashboard."}
        </div>
      ) : (
        <>
          <div className={styles.statsGrid}>
            <article>
              <span>{labels.patients}</span>
              <strong>{data.totalPatients}</strong>
            </article>
            <article>
              <span>{labels.appointments}</span>
              <strong>{data.todayAppointments}</strong>
            </article>
            <article>
              <span>{labels.noShows}</span>
              <strong>{data.todayNoShows}</strong>
            </article>
            <article>
              <span>{labels.followUps}</span>
              <strong>{data.todayFollowUps}</strong>
            </article>
            <article className={data.lowStockItems > 0 ? styles.warningCard : ""}>
              <span>{labels.lowStock}</span>
              <strong>{data.lowStockItems}</strong>
            </article>
          </div>

          {data.collectedRevenueThisMonth !== null && (
            <div className={styles.financeGrid}>
              <article className={styles.labFinanceCard}>
                <span>{labels.todayLab}</span>
                <strong>{money(data.todayLabExpenses)} EGP</strong>
              </article>
              <article className={styles.labFinanceCard}>
                <span>{labels.monthLab}</span>
                <strong>{money(data.labExpensesThisMonth)} EGP</strong>
              </article>
              <article>
                <span>{labels.revenue}</span>
                <strong>{money(data.collectedRevenueThisMonth)} EGP</strong>
              </article>
              <article>
                <span>{labels.expenses}</span>
                <strong>{money(data.expensesThisMonth)} EGP</strong>
              </article>
              <article>
                <span>{labels.net}</span>
                <strong>{money(data.netThisMonth)} EGP</strong>
              </article>
              <article>
                <span>{labels.debts}</span>
                <strong>{money(data.outstandingBalances)} EGP</strong>
              </article>
            </div>
          )}
        </>
      )}

      <section className={styles.quickSection}>
        <h2>{labels.operations}</h2>
        <div className={styles.quickGrid}>
          <Link to="/patients/new">{labels.newPatient}</Link>
          <Link to="/appointments">{labels.appointmentsLink}</Link>
          <Link to="/inventory">{labels.inventoryLink}</Link>
          <Link to="/reports">{labels.reportLink}</Link>
        </div>
      </section>
    </section>
  );
}
