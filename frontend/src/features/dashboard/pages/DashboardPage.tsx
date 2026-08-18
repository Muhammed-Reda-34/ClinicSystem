import { useQuery } from "@tanstack/react-query";
import type { ReactNode, SVGProps } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useDoctorContext } from "../../context/DoctorContext";
import { useLanguage } from "../../../i18n/LanguageContext";
import { getDashboard } from "../api/dashboardApi";
import { DoctorAvatar } from "../../profile/components/DoctorAvatar";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

function WalletIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 6.5h13a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2h11" />
      <path d="M15 11h6v4h-6a2 2 0 1 1 0-4Z" />
    </IconBase>
  );
}

function FlaskIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 3h6" />
      <path d="M10 3v5l-5.2 9a2.6 2.6 0 0 0 2.3 4h9.8a2.6 2.6 0 0 0 2.3-4L14 8V3" />
      <path d="M7.5 15h9" />
    </IconBase>
  );
}

function ReceiptIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </IconBase>
  );
}

function CalendarIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="m9 15 2 2 4-4" />
    </IconBase>
  );
}

function UsersIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}

function UserXIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="m18 8 5 5M23 8l-5 5" />
    </IconBase>
  );
}

function BoxIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m21 8-9-5-9 5 9 5 9-5Z" />
      <path d="m3 8 9 5 9-5M3 8v8l9 5 9-5V8M12 13v8" />
    </IconBase>
  );
}

function ArrowUpIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m7 11 5-5 5 5" />
      <path d="M12 18V6" />
    </IconBase>
  );
}

function SparklesIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m12 3 1.2 3.2L16.5 7.5l-3.3 1.3L12 12l-1.2-3.2-3.3-1.3 3.3-1.3L12 3Z" />
      <path d="m19 13 .8 2.2L22 16l-2.2.8L19 19l-.8-2.2L16 16l2.2-.8L19 13Z" />
      <path d="m5 14 .7 1.8 1.8.7-1.8.7L5 19l-.7-1.8-1.8-.7 1.8-.7L5 14Z" />
    </IconBase>
  );
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";

  return new Intl.NumberFormat("ar-EG", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getGreeting(ar: boolean) {
  const hour = new Date().getHours();

  if (ar) {
    if (hour < 12) return "صباح الخير";
    if (hour < 18) return "مساء الخير";
    return "مساء الخير";
  }

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

const dashboardCss = `
  .clinicDash {
    --dash-ink: #17343d;
    --dash-muted: #71848a;
    --dash-teal: #137b82;
    --dash-teal-dark: #0d5962;
    --dash-aqua: #eaf8f7;
    --dash-blue: #eef6ff;
    --dash-gold: #fff7e7;
    --dash-rose: #fff0f1;
    --dash-border: rgba(23, 71, 80, .09);
    display: grid;
    gap: 20px;
    width: 100%;
    animation: dashPageIn .5s cubic-bezier(.22, 1, .36, 1) both;
  }

  .clinicDash * { box-sizing: border-box; }

  .clinicDash__hero {
    position: relative;
    isolation: isolate;
    min-height: 210px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 28px;
    overflow: hidden;
    padding: 30px 32px;
    color: #fff;
    border-radius: 26px;
    background:
      radial-gradient(circle at 78% 18%, rgba(112, 236, 218, .32), transparent 24%),
      radial-gradient(circle at 16% 95%, rgba(79, 181, 199, .26), transparent 32%),
      linear-gradient(125deg, #103e50 0%, #126771 51%, #13858a 100%);
    box-shadow: 0 20px 48px rgba(19, 83, 92, .18);
  }

  .clinicDash__hero::before,
  .clinicDash__hero::after {
    content: "";
    position: absolute;
    z-index: -1;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, .13);
    pointer-events: none;
  }

  .clinicDash__hero::before {
    width: 260px;
    height: 260px;
    inset-inline-end: -76px;
    top: -112px;
    animation: dashFloat 9s ease-in-out infinite;
  }

  .clinicDash__hero::after {
    width: 180px;
    height: 180px;
    inset-inline-start: 36%;
    bottom: -140px;
    animation: dashFloat 11s ease-in-out -2s infinite reverse;
  }

  .clinicDash__heroContent {
    min-width: 0;
    position: relative;
    z-index: 2;
  }

  .clinicDash__eyebrow {
    width: fit-content;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding: 7px 11px;
    color: #dffbfa;
    background: rgba(255,255,255,.09);
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 999px;
    backdrop-filter: blur(12px);
    font-size: 12px;
    font-weight: 800;
    letter-spacing: .02em;
  }

  .clinicDash__eyebrow svg { width: 15px; height: 15px; }

  .clinicDash__hero h1 {
    margin: 0;
    max-width: 720px;
    font-size: clamp(30px, 4vw, 46px);
    line-height: 1.2;
    letter-spacing: -.02em;
  }

  .clinicDash__hero h1 strong {
    color: #a9f0e8;
    font-weight: 900;
  }

  .clinicDash__heroText {
    max-width: 660px;
    margin: 10px 0 0;
    color: rgba(237, 252, 253, .82);
    font-size: 13px;
    line-height: 1.8;
  }

  .clinicDash__date {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-top: 16px;
    color: rgba(236, 251, 252, .72);
    font-size: 12px;
    font-weight: 700;
  }

  .clinicDash__date svg { width: 15px; height: 15px; }

  .clinicDash__profile {
    position: relative;
    z-index: 2;
    min-width: 232px;
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 15px 16px;
    background: rgba(255,255,255,.11);
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 20px;
    backdrop-filter: blur(16px);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
    animation: dashProfileIn .65s .12s cubic-bezier(.22,1,.36,1) both;
  }

  .clinicDash__profileText {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .clinicDash__profileText span {
    color: rgba(223, 246, 248, .72);
    font-size: 10px;
    font-weight: 700;
  }

  .clinicDash__profileText strong {
    overflow: hidden;
    color: #fff;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
  }

  .clinicDash__scope {
    margin-top: 2px;
    color: #bfe8e8 !important;
    font-size: 10px !important;
  }

  .clinicDash__sectionHead {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 16px;
  }

  .clinicDash__sectionHead h2 {
    margin: 0;
    color: var(--dash-ink);
    font-size: 17px;
  }

  .clinicDash__sectionHead p {
    margin: 4px 0 0;
    color: var(--dash-muted);
    font-size: 11px;
  }

  .clinicDash__live {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    flex: none;
    color: #55747b;
    font-size: 10px;
    font-weight: 800;
  }

  .clinicDash__liveDot {
    width: 8px;
    height: 8px;
    background: #20b987;
    border-radius: 50%;
    box-shadow: 0 0 0 5px rgba(32,185,135,.10);
    animation: dashPulse 2s ease-out infinite;
  }

  .clinicDash__mainGrid {
    display: grid;
    grid-template-columns: 1.35fr repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .clinicDash__card {
    position: relative;
    min-width: 0;
    min-height: 176px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 18px;
    padding: 20px;
    color: var(--dash-ink);
    background: #fff;
    border: 1px solid var(--dash-border);
    border-radius: 20px;
    box-shadow: 0 10px 30px rgba(27, 74, 83, .055);
    transition: transform .24s ease, box-shadow .24s ease, border-color .24s ease;
    animation: dashCardIn .55s cubic-bezier(.22, 1, .36, 1) both;
  }

  .clinicDash__card:nth-child(2) { animation-delay: .06s; }
  .clinicDash__card:nth-child(3) { animation-delay: .12s; }
  .clinicDash__card:nth-child(4) { animation-delay: .18s; }

  .clinicDash__card:hover {
    transform: translateY(-4px);
    border-color: rgba(22, 125, 132, .20);
    box-shadow: 0 18px 40px rgba(27, 74, 83, .09);
  }

  .clinicDash__card::after {
    content: "";
    position: absolute;
    width: 90px;
    height: 90px;
    inset-inline-end: -34px;
    bottom: -42px;
    border-radius: 50%;
    background: currentColor;
    opacity: .025;
  }

  .clinicDash__card--profit {
    color: #0d666c;
    background:
      radial-gradient(circle at 88% 12%, rgba(57, 191, 177, .13), transparent 33%),
      linear-gradient(150deg, #effcfa 0%, #ffffff 72%);
    border-color: rgba(30, 152, 145, .16);
  }

  .clinicDash__card--lab {
    background: linear-gradient(155deg, #f2f8ff 0%, #ffffff 72%);
  }

  .clinicDash__card--due {
    background: linear-gradient(155deg, #fff9ed 0%, #ffffff 72%);
  }

  .clinicDash__card--follow {
    background: linear-gradient(155deg, #f7f3ff 0%, #ffffff 72%);
  }

  .clinicDash__cardTop {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .clinicDash__icon {
    width: 43px;
    height: 43px;
    flex: none;
    display: grid;
    place-items: center;
    color: var(--dash-teal);
    background: var(--dash-aqua);
    border: 1px solid rgba(22, 125, 132, .08);
    border-radius: 14px;
  }

  .clinicDash__icon svg { width: 21px; height: 21px; }
  .clinicDash__card--lab .clinicDash__icon { color: #4775a8; background: var(--dash-blue); }
  .clinicDash__card--due .clinicDash__icon { color: #a87828; background: var(--dash-gold); }
  .clinicDash__card--follow .clinicDash__icon { color: #7456a6; background: #f4efff; }

  .clinicDash__trend {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #14845f;
    font-size: 10px;
    font-weight: 900;
  }

  .clinicDash__trend svg { width: 14px; height: 14px; }

  .clinicDash__label {
    display: block;
    color: #6d8288;
    font-size: 11px;
    font-weight: 850;
    line-height: 1.6;
  }

  .clinicDash__value {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-top: 8px;
    color: var(--dash-ink);
    direction: ltr;
    justify-content: flex-end;
    text-align: end;
  }

  [dir="ltr"] .clinicDash__value {
    justify-content: flex-start;
    text-align: start;
  }

  .clinicDash__value strong {
    font-size: clamp(27px, 2.7vw, 38px);
    line-height: 1;
    letter-spacing: -.035em;
    font-variant-numeric: tabular-nums;
  }

  .clinicDash__value small {
    color: #8a9a9e;
    font-size: 10px;
    font-weight: 800;
  }

  .clinicDash__card--profit .clinicDash__value strong { color: #0d6e72; }

  .clinicDash__hint {
    margin: 0;
    color: #8a999d;
    font-size: 10px;
    line-height: 1.65;
  }

  .clinicDash__today {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .clinicDash__todayItem {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 15px 17px;
    background: #fff;
    border: 1px solid var(--dash-border);
    border-radius: 17px;
    box-shadow: 0 7px 22px rgba(27, 74, 83, .04);
    transition: transform .2s ease, box-shadow .2s ease;
    animation: dashCardIn .55s .2s cubic-bezier(.22, 1, .36, 1) both;
  }

  .clinicDash__todayItem:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(27, 74, 83, .07);
  }

  .clinicDash__todayIcon {
    width: 38px;
    height: 38px;
    flex: none;
    display: grid;
    place-items: center;
    color: #466f79;
    background: #f2f8f8;
    border-radius: 12px;
  }

  .clinicDash__todayIcon svg { width: 19px; height: 19px; }
  .clinicDash__todayItem--danger .clinicDash__todayIcon { color: #b14d58; background: var(--dash-rose); }
  .clinicDash__todayItem--warning .clinicDash__todayIcon { color: #9b7228; background: var(--dash-gold); }

  .clinicDash__todayCopy { min-width: 0; display: grid; gap: 2px; }
  .clinicDash__todayCopy span { color: #7d8f94; font-size: 10px; font-weight: 800; }
  .clinicDash__todayCopy strong { color: var(--dash-ink); font-size: 23px; line-height: 1.1; font-variant-numeric: tabular-nums; }

  .clinicDash__state {
    min-height: 220px;
    display: grid;
    place-items: center;
    color: #75898f;
    background: #fff;
    border: 1px solid var(--dash-border);
    border-radius: 22px;
  }

  .clinicDash__loader {
    display: grid;
    place-items: center;
    gap: 12px;
    font-size: 12px;
    font-weight: 800;
  }

  .clinicDash__loaderRing {
    width: 34px;
    height: 34px;
    border: 3px solid #e5efef;
    border-top-color: var(--dash-teal);
    border-radius: 50%;
    animation: dashSpin .8s linear infinite;
  }

  @keyframes dashPageIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes dashProfileIn {
    from { opacity: 0; transform: translateX(12px) scale(.98); }
    to { opacity: 1; transform: translateX(0) scale(1); }
  }

  @keyframes dashCardIn {
    from { opacity: 0; transform: translateY(14px) scale(.985); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes dashFloat {
    0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
    50% { transform: translate3d(0, 12px, 0) rotate(5deg); }
  }

  @keyframes dashPulse {
    0% { box-shadow: 0 0 0 0 rgba(32,185,135,.28); }
    70%, 100% { box-shadow: 0 0 0 8px rgba(32,185,135,0); }
  }

  @keyframes dashSpin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    .clinicDash *, .clinicDash *::before, .clinicDash *::after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: .01ms !important;
    }
  }

  @media (max-width: 1180px) {
    .clinicDash__mainGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 820px) {
    .clinicDash__hero {
      grid-template-columns: 1fr;
      min-height: 0;
      padding: 25px;
    }

    .clinicDash__profile { width: 100%; min-width: 0; }
    .clinicDash__today { grid-template-columns: 1fr; }
  }

  @media (max-width: 580px) {
    .clinicDash { gap: 15px; }
    .clinicDash__hero { padding: 21px; border-radius: 21px; }
    .clinicDash__hero h1 { font-size: 28px; }
    .clinicDash__mainGrid { grid-template-columns: 1fr; }
    .clinicDash__card { min-height: 154px; padding: 18px; }
    .clinicDash__sectionHead { align-items: flex-start; flex-direction: column; gap: 8px; }
  }
`;

interface StatCardProps {
  className?: string;
  icon: ReactNode;
  label: string;
  value: string | number;
  currency?: boolean;
  hint: string;
  highlight?: boolean;
}

function StatCard({
  className = "",
  icon,
  label,
  value,
  currency = false,
  hint,
  highlight = false,
}: StatCardProps) {
  return (
    <article className={`clinicDash__card ${className}`}>
      <div className="clinicDash__cardTop">
        <span className="clinicDash__icon">{icon}</span>
        {highlight ? (
          <span className="clinicDash__trend">
            <ArrowUpIcon />
            Live
          </span>
        ) : null}
      </div>

      <div>
        <span className="clinicDash__label">{label}</span>
        <div className="clinicDash__value">
          <strong>{value}</strong>
          {currency ? <small>EGP</small> : null}
        </div>
      </div>

      <p className="clinicDash__hint">{hint}</p>
    </article>
  );
}

interface TodayMetricProps {
  icon: ReactNode;
  label: string;
  value: number;
  tone?: "default" | "danger" | "warning";
}

function TodayMetric({ icon, label, value, tone = "default" }: TodayMetricProps) {
  const toneClass = tone === "default" ? "" : `clinicDash__todayItem--${tone}`;

  return (
    <div className={`clinicDash__todayItem ${toneClass}`}>
      <span className="clinicDash__todayIcon">{icon}</span>
      <div className="clinicDash__todayCopy">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
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
  const greeting = getGreeting(ar);
  const today = getTodayLabel(ar);
  const doctorScope = selectedDoctor?.fullName ?? (ar ? "كل الأطباء" : "All doctors");

  return (
    <section className="clinicDash">
      <style>{dashboardCss}</style>

      <header className="clinicDash__hero">
        <div className="clinicDash__heroContent">
          <div className="clinicDash__eyebrow">
            <SparklesIcon />
            <span>Blue Dahab</span>
          </div>

          <h1>
            {greeting}، <strong>{user?.fullName ?? (ar ? "دكتور" : "Doctor")}</strong>
          </h1>

          <p className="clinicDash__heroText">
            {ar
              ? "نظرة سريعة على أهم ما تحتاجه لإدارة يومك في العيادة، بدون أرقام زائدة أو تفاصيل مشتتة."
              : "A focused view of the clinic numbers that matter today, without unnecessary clutter."}
          </p>

          <span className="clinicDash__date">
            <CalendarIcon />
            {today}
          </span>
        </div>

        <div className="clinicDash__profile">
          <DoctorAvatar size="medium" />
          <div className="clinicDash__profileText">
            <span>{ar ? "الحساب الحالي" : "Current account"}</span>
            <strong>{user?.fullName}</strong>
            <span className="clinicDash__scope">{doctorScope}</span>
          </div>
        </div>
      </header>

      {query.isLoading ? (
        <div className="clinicDash__state">
          <div className="clinicDash__loader">
            <span className="clinicDash__loaderRing" />
            <span>{ar ? "جاري تجهيز لوحة التحكم..." : "Preparing your dashboard..."}</span>
          </div>
        </div>
      ) : query.isError || !data ? (
        <div className="clinicDash__state">
          {ar ? "تعذر تحميل لوحة التحكم." : "Unable to load dashboard."}
        </div>
      ) : (
        <>
          <div className="clinicDash__sectionHead">
            <div>
              <h2>{ar ? "المؤشرات الأهم" : "Key indicators"}</h2>
              <p>
                {ar
                  ? canViewFinancials
                    ? "ملخص الشهر الحالي والمتابعات المطلوبة اليوم."
                    : "ملخص التشغيل اليومي للعيادة."
                  : canViewFinancials
                    ? "Current month performance and today's follow-ups."
                    : "Today's clinic operations at a glance."}
              </p>
            </div>

            <span className="clinicDash__live">
              <span className="clinicDash__liveDot" />
              {ar ? "تحديث تلقائي" : "Auto refresh"}
            </span>
          </div>

          {canViewFinancials ? (
            <div className="clinicDash__mainGrid">
              <StatCard
                className="clinicDash__card--profit"
                icon={<WalletIcon />}
                label={ar ? "صافي ربح الطبيب هذا الشهر" : "Doctor net profit this month"}
                value={money(data.netThisMonth)}
                currency
                highlight
                hint={
                  ar
                    ? "المحصل بعد خصم المعمل والمصروفات والرواتب واستهلاك المخزون."
                    : "Collected revenue after lab, expenses, payroll and inventory consumption."
                }
              />

              <StatCard
                className="clinicDash__card--lab"
                icon={<FlaskIcon />}
                label={ar ? "مصاريف المعمل هذا الشهر" : "Lab expenses this month"}
                value={money(data.labExpensesThisMonth)}
                currency
                hint={ar ? "إجمالي قيم المعمل المسجلة خلال الشهر." : "Total lab costs recorded this month."}
              />

              <StatCard
                className="clinicDash__card--due"
                icon={<ReceiptIcon />}
                label={ar ? "مبالغ مستحقة على المرضى" : "Patient outstanding balances"}
                value={money(data.outstandingBalances)}
                currency
                hint={ar ? "إجمالي المتبقي غير المحصل حتى الآن." : "Total patient balance still unpaid."}
              />

              <StatCard
                className="clinicDash__card--follow"
                icon={<UsersIcon />}
                label={ar ? "متابعات اليوم" : "Today's follow-ups"}
                value={data.todayFollowUps}
                hint={ar ? "المرضى المطلوب التواصل معهم اليوم." : "Patients who need follow-up today."}
              />
            </div>
          ) : (
            <div className="clinicDash__mainGrid">
              <StatCard
                className="clinicDash__card--profit"
                icon={<CalendarIcon />}
                label={ar ? "حجوزات اليوم" : "Today's bookings"}
                value={data.todayAppointments}
                highlight
                hint={ar ? "الحجوزات المبدئية المسجلة بتاريخ اليوم." : "Preliminary bookings scheduled for today."}
              />

              <StatCard
                className="clinicDash__card--lab"
                icon={<UsersIcon />}
                label={ar ? "متابعات اليوم" : "Today's follow-ups"}
                value={data.todayFollowUps}
                hint={ar ? "المرضى المطلوب التواصل معهم اليوم." : "Patients due for follow-up today."}
              />

              <StatCard
                className="clinicDash__card--due"
                icon={<UserXIcon />}
                label={ar ? "لم يحضر اليوم" : "Today's no-shows"}
                value={data.todayNoShows}
                hint={ar ? "الحجوزات المسجلة بحالة لم يحضر." : "Bookings currently marked as no-show."}
              />

              <StatCard
                className="clinicDash__card--follow"
                icon={<BoxIcon />}
                label={ar ? "تنبيهات المخزون" : "Low stock alerts"}
                value={data.lowStockItems}
                hint={ar ? "الأصناف التي وصلت أو اقتربت من حد إعادة الطلب." : "Items at or below their reorder level."}
              />
            </div>
          )}

          <div className="clinicDash__sectionHead">
            <div>
              <h2>{ar ? "حركة اليوم" : "Today's activity"}</h2>
              <p>{ar ? "ثلاث إشارات سريعة تحتاج عينك أثناء اليوم." : "Three quick signals worth watching today."}</p>
            </div>
          </div>

          <div className="clinicDash__today">
            <TodayMetric
              icon={<CalendarIcon />}
              label={ar ? "حجوزات اليوم" : "Today's bookings"}
              value={data.todayAppointments}
            />

            <TodayMetric
              icon={<UserXIcon />}
              label={ar ? "لم يحضر" : "No-shows"}
              value={data.todayNoShows}
              tone={data.todayNoShows > 0 ? "danger" : "default"}
            />

            <TodayMetric
              icon={<BoxIcon />}
              label={ar ? "تنبيهات المخزون" : "Low stock alerts"}
              value={data.lowStockItems}
              tone={data.lowStockItems > 0 ? "warning" : "default"}
            />
          </div>
        </>
      )}
    </section>
  );
}
