import { useQuery } from "@tanstack/react-query";
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
  const { user, hasRole } = useAuth();
  const { selectedDoctor } = useDoctorContext();
  const { language } = useLanguage();
  const ar = language === "ar";

  const canViewFinancials =
    hasRole("Owner") || hasRole("Doctor");

  const query = useQuery({
    queryKey: [
      "dashboard",
      selectedDoctor?.doctorId ?? "all",
    ],
    queryFn: getDashboard,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const data = query.data;

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>Blue Dahab</p>
          <h1>{ar ? "لوحة التحكم" : "Dashboard"}</h1>
          <p>
            {ar
              ? "أهم أرقام اليوم والشهر بدون زحمة." 
              : "The clinic numbers that matter, without clutter."}
          </p>
          <small>
            {selectedDoctor?.fullName
              ?? (ar ? "كل الأطباء" : "All doctors")}
          </small>
        </div>

        <div className={styles.userBlock}>
          <DoctorAvatar size="medium" />
          <div>
            <span>{ar ? "مرحبًا" : "Welcome"}</span>
            <strong>{user?.fullName}</strong>
          </div>
        </div>
      </header>

      {query.isLoading ? (
        <div className={styles.state}>
          {ar ? "جاري تحميل المؤشرات..." : "Loading dashboard..."}
        </div>
      ) : query.isError || !data ? (
        <div className={styles.state}>
          {ar ? "تعذر تحميل لوحة التحكم." : "Unable to load dashboard."}
        </div>
      ) : canViewFinancials ? (
        <>
          <div className={styles.primaryGrid}>
            <article className={styles.netCard}>
              <span>{ar ? "صافي ربح الطبيب هذا الشهر" : "Doctor net profit this month"}</span>
              <strong>{money(data.netThisMonth)} EGP</strong>
              <small>
                {ar
                  ? "المحصل ناقص المعمل والمصروفات والرواتب واستهلاك المخزون حسب نطاق الحساب."
                  : "Collected revenue minus lab, clinic expenses, payroll and inventory consumption within the current scope."}
              </small>
            </article>

            <article>
              <span>{ar ? "مصاريف المعمل هذا الشهر" : "Lab expenses this month"}</span>
              <strong>{money(data.labExpensesThisMonth)} EGP</strong>
              <small>{ar ? "كل القيم المسجلة في المعمل خلال الشهر." : "All lab costs recorded this month."}</small>
            </article>

            <article>
              <span>{ar ? "مبالغ مستحقة على المرضى" : "Patient outstanding balances"}</span>
              <strong>{money(data.outstandingBalances)} EGP</strong>
              <small>{ar ? "إجمالي المتبقي غير المحصل حتى الآن." : "Total unpaid patient balance."}</small>
            </article>

            <article>
              <span>{ar ? "متابعات اليوم" : "Today's follow-ups"}</span>
              <strong>{data.todayFollowUps}</strong>
              <small>{ar ? "المتابعات المستحقة بتاريخ اليوم." : "Follow-ups due today."}</small>
            </article>
          </div>

          <div className={styles.todayBar}>
            <div>
              <span>{ar ? "حجوزات اليوم" : "Today's bookings"}</span>
              <strong>{data.todayAppointments}</strong>
            </div>
            <div>
              <span>{ar ? "لم يحضر" : "No-shows"}</span>
              <strong>{data.todayNoShows}</strong>
            </div>
            <div className={data.lowStockItems > 0 ? styles.warningMetric : ""}>
              <span>{ar ? "تنبيهات المخزون" : "Low stock"}</span>
              <strong>{data.lowStockItems}</strong>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.primaryGrid}>
          <article>
            <span>{ar ? "حجوزات اليوم" : "Today's bookings"}</span>
            <strong>{data.todayAppointments}</strong>
            <small>{ar ? "الحجوزات المبدئية بتاريخ اليوم." : "Preliminary bookings scheduled for today."}</small>
          </article>

          <article>
            <span>{ar ? "لم يحضر اليوم" : "Today's no-shows"}</span>
            <strong>{data.todayNoShows}</strong>
            <small>{ar ? "الحالات المسجلة لم يحضر." : "Bookings marked as no-show."}</small>
          </article>

          <article>
            <span>{ar ? "متابعات اليوم" : "Today's follow-ups"}</span>
            <strong>{data.todayFollowUps}</strong>
            <small>{ar ? "المتابعات المطلوب التواصل معها اليوم." : "Follow-ups due today."}</small>
          </article>

          <article className={data.lowStockItems > 0 ? styles.warningCard : ""}>
            <span>{ar ? "تنبيهات المخزون" : "Low stock alerts"}</span>
            <strong>{data.lowStockItems}</strong>
            <small>{ar ? "أصناف وصلت أو اقتربت من حد إعادة الطلب." : "Items at or below reorder level."}</small>
          </article>
        </div>
      )}
    </section>
  );
}
