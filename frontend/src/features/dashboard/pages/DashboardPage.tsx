import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppIcon } from "../../../components/icons/AppIcon";
import { ClinicPageHeader } from "../../../components/ui/ClinicPageHeader";
import { useAuth } from "../../auth/AuthContext";
import { useDoctorContext } from "../../context/DoctorContext";
import { useLanguage } from "../../../i18n/LanguageContext";
import { getDashboard } from "../api/dashboardApi";
import styles from "./DashboardPage.module.css";

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("ar-EG", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getGreeting(ar: boolean) {
  const hour = new Date().getHours();
  if (ar) return hour < 12 ? "صباح الخير" : "مساء الخير";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getTodayLabel(ar: boolean) {
  return new Intl.DateTimeFormat(ar ? "ar-EG" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

type SummaryCardProps = {
  icon: Parameters<typeof AppIcon>[0]["name"];
  label: string;
  value: string | number;
  hint: string;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
};

function SummaryCard({
  icon,
  label,
  value,
  hint,
  tone = "neutral",
}: SummaryCardProps) {
  return (
    <article className={`${styles.summaryCard} ${styles[`summary_${tone}`]}`}>
      <span className={styles.summaryIcon}>
        <AppIcon name={icon} size={20} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{hint}</p>
      </div>
    </article>
  );
}

export function DashboardPage() {
  const { user, hasRole } = useAuth();
  const { selectedDoctor } = useDoctorContext();
  const { language } = useLanguage();
  const ar = language === "ar";
  const canViewFinancials = hasRole("Owner") || hasRole("Doctor");

  const query = useQuery({
    queryKey: ["dashboard", selectedDoctor?.doctorId ?? "all"],
    queryFn: getDashboard,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const data = query.data;
  const doctorScope = selectedDoctor?.fullName ?? (ar ? "كل الأطباء" : "All doctors");
  const greeting = getGreeting(ar);
  const today = getTodayLabel(ar);

  return (
    <section className={styles.page}>
      <ClinicPageHeader
        eyebrow="Blue Dahab"
        title={
          <>
            {greeting}، <span className={styles.userName}>{user?.fullName ?? (ar ? "دكتور" : "Doctor")}</span>
          </>
        }
        subtitle={
          ar
            ? "لوحة يومية مختصرة: التحصيل، الحجوزات، المتابعات والتنبيهات المهمة في مكان واحد."
            : "A focused daily cockpit for collections, bookings, follow-ups and important alerts."
        }
        icon="dashboard"
        badge={doctorScope}
        actions={<span className={styles.dateBadge}><AppIcon name="calendar" size={15} />{today}</span>}
        metrics={[
          {
            label: ar ? "إيراد اليوم" : "Today's revenue",
            value: data ? `${money(data.todayCollectedRevenue)} EGP` : "—",
            icon: "debt",
            tone: "success",
            hint: ar ? "يتجدد تلقائيًا كل يوم" : "Resets by date automatically",
          },
          {
            label: ar ? "حجوزات اليوم" : "Today's bookings",
            value: data?.todayAppointments ?? "—",
            icon: "calendar",
            tone: "primary",
          },
          {
            label: ar ? "متابعات اليوم" : "Today's follow-ups",
            value: data?.todayFollowUps ?? "—",
            icon: "followUp",
            tone: data && data.todayFollowUps > 0 ? "warning" : "neutral",
          },
          {
            label: ar ? "لم يحضر" : "No-shows",
            value: data?.todayNoShows ?? "—",
            icon: "warning",
            tone: data && data.todayNoShows > 0 ? "danger" : "neutral",
          },
        ]}
      />

      {query.isLoading ? (
        <div className={styles.state}>
          <span className={styles.loader} />
          {ar ? "جاري تجهيز لوحة التحكم..." : "Preparing your dashboard..."}
        </div>
      ) : query.isError || !data ? (
        <div className={styles.state}>
          {ar ? "تعذر تحميل لوحة التحكم." : "Unable to load dashboard."}
        </div>
      ) : (
        <>
          <div className={styles.sectionHeading}>
            <div>
              <span>{ar ? "تحديث تلقائي" : "Auto refresh"}</span>
              <h2>{canViewFinancials ? (ar ? "ملخص الشهر" : "Monthly pulse") : (ar ? "تشغيل العيادة" : "Clinic operations")}</h2>
            </div>
            <span className={styles.live}><i />Live</span>
          </div>

          <div className={styles.summaryGrid}>
            {canViewFinancials ? (
              <>
                <SummaryCard
                  icon="reports"
                  label={ar ? "صافي ربح الطبيب هذا الشهر" : "Doctor net profit this month"}
                  value={`${money(data.netThisMonth)} EGP`}
                  hint={ar ? "بعد خصم المعمل والمصروفات والرواتب واستهلاك المخزون." : "After lab, expenses, payroll and inventory consumption."}
                  tone="primary"
                />
                <SummaryCard
                  icon="lab"
                  label={ar ? "مصاريف المعمل المدفوعة" : "Paid lab expenses"}
                  value={`${money(data.labExpensesThisMonth)} EGP`}
                  hint={ar ? "يُخصم المدفوع فعليًا فقط." : "Only values actually paid are deducted."}
                  tone="neutral"
                />
                <SummaryCard
                  icon="warning"
                  label={ar ? "مبالغ مستحقة على المرضى" : "Patient outstanding balances"}
                  value={`${money(data.outstandingBalances)} EGP`}
                  hint={ar ? "لا تتصفر مع يوم أو شهر جديد." : "Carries forward across days and months."}
                  tone={(data.outstandingBalances ?? 0) > 0 ? "warning" : "success"}
                />
              </>
            ) : (
              <>
                <SummaryCard
                  icon="calendar"
                  label={ar ? "حجوزات اليوم" : "Today's bookings"}
                  value={data.todayAppointments}
                  hint={ar ? "الحجوزات المسجلة بتاريخ اليوم." : "Bookings scheduled for today."}
                  tone="primary"
                />
                <SummaryCard
                  icon="followUp"
                  label={ar ? "متابعات اليوم" : "Today's follow-ups"}
                  value={data.todayFollowUps}
                  hint={ar ? "المرضى المطلوب التواصل معهم اليوم." : "Patients due for follow-up today."}
                  tone="warning"
                />
              </>
            )}

            <SummaryCard
              icon="inventory"
              label={ar ? "تنبيهات المخزون" : "Low stock alerts"}
              value={data.lowStockItems}
              hint={ar ? "أصناف وصلت أو اقتربت من حد إعادة الطلب." : "Items at or below their reorder level."}
              tone={data.lowStockItems > 0 ? "warning" : "success"}
            />
          </div>

          <nav className={styles.quickNav} aria-label={ar ? "اختصارات اليوم" : "Daily shortcuts"}>
            <Link to="/patients">
              <AppIcon name="patients" />
              <span><strong>{ar ? "المرضى" : "Patients"}</strong><small>{ar ? "بحث وفتح الملفات" : "Search and open files"}</small></span>
              <AppIcon name="chevron" size={16} />
            </Link>
            <Link to="/appointments">
              <AppIcon name="calendar" />
              <span><strong>{ar ? "الحجوزات" : "Bookings"}</strong><small>{ar ? "إدارة مواعيد اليوم" : "Manage today's schedule"}</small></span>
              <AppIcon name="chevron" size={16} />
            </Link>
            <Link to="/follow-ups">
              <AppIcon name="followUp" />
              <span><strong>{ar ? "المتابعات" : "Follow-ups"}</strong><small>{ar ? "اتصالات وتذكير المرضى" : "Calls and reminders"}</small></span>
              <AppIcon name="chevron" size={16} />
            </Link>
          </nav>
        </>
      )}
    </section>
  );
}
