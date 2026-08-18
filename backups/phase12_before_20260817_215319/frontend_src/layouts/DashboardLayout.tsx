import {
  useState,
} from "react";
import {
  Outlet,
} from "react-router-dom";
import {
  Sidebar,
} from "../components/navigation/Sidebar";
import {
  TopHeader,
} from "../components/navigation/TopHeader";
import styles from "./DashboardLayout.module.css";

export function DashboardLayout() {
  const [
    mobileNavigationOpen,
    setMobileNavigationOpen,
  ] =
    useState(false);

  return (
    <div className={styles.shell}>
      <Sidebar
        mobileOpen={
          mobileNavigationOpen
        }
        onClose={() =>
          setMobileNavigationOpen(
            false,
          )
        }
      />

      {mobileNavigationOpen && (
        <button
          className={styles.backdrop}
          type="button"
          aria-label="Close navigation"
          onClick={() =>
            setMobileNavigationOpen(
              false,
            )
          }
        />
      )}

      <div className={styles.workspace}>
        <TopHeader
          onOpenNavigation={() =>
            setMobileNavigationOpen(
              true,
            )
          }
        />

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
