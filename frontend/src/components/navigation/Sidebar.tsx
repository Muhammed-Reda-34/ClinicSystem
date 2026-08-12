import {
  NavLink,
} from "react-router-dom";
import {
  useQuery,
} from "@tanstack/react-query";
import {
  useAuth,
} from "../../features/auth/AuthContext";
import {
  useLanguage,
} from "../../i18n/LanguageContext";
import type {
  TranslationKey,
} from "../../i18n/translations";
import {
  AppIcon,
  type AppIconName,
} from "../icons/AppIcon";
import {
  getFollowUpVisits,
} from "../../features/visits/api/visitsApi";
import {
  getClinicSettings,
} from "../../features/settings/api/settingsApi";
import styles from "./Sidebar.module.css";

type NavItem = {
  to: string;
  label: TranslationKey;
  icon: AppIconName;
  roles?: string[];
};

const items: NavItem[] = [
  {
    to: "/",
    label: "dashboard",
    icon: "dashboard",
  },
  {
    to: "/patients",
    label: "patients",
    icon: "patients",
  },
  {
    to: "/blacklist",
    label: "blacklist",
    icon: "warning",
  },
  {
    to: "/appointments",
    label: "appointments",
    icon: "calendar",
  },
  {
    to: "/follow-ups",
    label: "followUps",
    icon: "followUp",
  },
  {
    to: "/debts",
    label: "debts",
    icon: "debt",
    roles: [
      "Owner",
      "Doctor",
      "Secretary",
    ],
  },
  {
    to: "/visits",
    label: "visits",
    icon: "tooth",
  },
  {
    to: "/services",
    label: "services",
    icon: "services",
  },
  {
    to: "/lab",
    label: "lab",
    icon: "lab",
  },
  {
    to: "/inventory",
    label: "inventory",
    icon: "inventory",
  },
  {
    to: "/users",
    label: "users",
    icon: "users",
    roles: ["Owner"],
  },
  {
    to: "/reports",
    label: "reports",
    icon: "reports",
    roles: [
      "Owner",
      "Doctor",
    ],
  },
  {
    to: "/audit",
    label: "audit",
    icon: "audit",
    roles: ["Owner"],
  },
  {
    to: "/settings",
    label: "settings",
    icon: "settings",
    roles: ["Owner"],
  },
];

export function Sidebar() {
  const {
    user,
    hasRole,
    logout,
  } =
    useAuth();

  const {
    t,
  } =
    useLanguage();

  const settingsQuery =
    useQuery({
      queryKey:
        ["clinic-settings"],
      queryFn:
        getClinicSettings,
      staleTime:
        5 * 60_000,
    });

  const todayBounds = (() => {
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return {
      fromUtc: start.toISOString(),
      toUtc: end.toISOString(),
    };
  })();

  const followUpsQuery =
    useQuery({
      queryKey: [
        "sidebar-follow-ups",
        todayBounds.fromUtc,
      ],
      queryFn: () =>
        getFollowUpVisits(
          todayBounds.fromUtc,
          todayBounds.toUtc,
        ),
      staleTime: 60_000,
    });

  const todayFollowUpsCount =
    followUpsQuery.data
      ?.length
    ?? 0;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandBlock}>
        <div className={styles.brandMark}>
          BD
        </div>

        <div>
          <div className={styles.brandName}>
            {settingsQuery.data
              ?.clinicName
              ?? t("brand")}
          </div>

          <div className={styles.brandCaption}>
            Dental Clinic System
          </div>
        </div>
      </div>

      <nav
        className={styles.navigation}
        aria-label="Main navigation"
      >
        {items.map(
          item => {
            if (
              item.roles
              && !item.roles.some(
                role =>
                  hasRole(role),
              )
            ) {
              return null;
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={
                  item.to === "/"
                }
                className={({
                  isActive,
                }) =>
                  [
                    styles.navItem,
                    isActive
                      ? styles.active
                      : "",
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(" ")
                }
              >
                <span className={styles.navIcon}>
                  <AppIcon
                    name={item.icon}
                    size={19}
                  />
                </span>

                <span className={styles.navLabel}>
                  {t(
                    item.label,
                  )}
                </span>

                {item.to === "/follow-ups"
                  && todayFollowUpsCount > 0
                  && (
                    <span className={styles.navBadge}>
                      {todayFollowUpsCount}
                    </span>
                  )}
              </NavLink>
            );
          },
        )}
      </nav>

      <div className={styles.accountCard}>
        <div className={styles.avatar}>
          {user?.fullName
            ?.trim()
            .charAt(0)
            .toUpperCase()
            || "U"}
        </div>

        <div className={styles.accountInfo}>
          <strong>
            {user?.fullName}
          </strong>

          <small>
            {user?.roles.join(
              " • ",
            )}
          </small>
        </div>

        <button
          className={styles.logoutButton}
          type="button"
          onClick={() =>
            void logout()
          }
          title={t("logout")}
        >
          <AppIcon
            name="logout"
            size={18}
          />
        </button>
      </div>
    </aside>
  );
}
