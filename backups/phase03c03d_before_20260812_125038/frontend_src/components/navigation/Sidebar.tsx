import { NavLink } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import type { TranslationKey } from "../../i18n/translations";
import {
  AppIcon,
  type AppIconName,
} from "../icons/AppIcon";
import styles from "./Sidebar.module.css";

type NavItem = {
  to: string;
  label: TranslationKey;
  icon: AppIconName;
  ownerOnly?: boolean;
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
    ownerOnly: true,
  },
  {
    to: "/reports",
    label: "reports",
    icon: "reports",
  },
  {
    to: "/audit",
    label: "audit",
    icon: "audit",
    ownerOnly: true,
  },
  {
    to: "/settings",
    label: "settings",
    icon: "settings",
    ownerOnly: true,
  },
];

export function Sidebar() {
  const {
    user,
    hasRole,
    logout,
  } = useAuth();

  const { t } = useLanguage();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brandBlock}>
        <div className={styles.brandMark}>
          BD
        </div>

        <div>
          <div className={styles.brandName}>
            {t("brand")}
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
        {items.map(item => {
          if (
            item.ownerOnly
            && !hasRole("Owner")
          ) {
            return null;
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                [
                  styles.navItem,
                  isActive
                    ? styles.active
                    : "",
                ]
                  .filter(Boolean)
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
                {t(item.label)}
              </span>
            </NavLink>
          );
        })}
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
            {user?.roles.join(" • ")}
          </small>
        </div>

        <button
          className={styles.logoutButton}
          type="button"
          onClick={() => void logout()}
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
