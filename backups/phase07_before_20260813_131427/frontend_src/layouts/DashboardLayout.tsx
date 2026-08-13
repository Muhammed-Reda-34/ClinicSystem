import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/navigation/Sidebar";
import { TopHeader } from "../components/navigation/TopHeader";
import styles from "./DashboardLayout.module.css";

export function DashboardLayout() {
  return (
    <div className={styles.shell}>
      <Sidebar />

      <div className={styles.workspace}>
        <TopHeader />

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
