import {
  Navigate,
  Outlet,
} from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import styles from "./ProtectedRoute.module.css";

export function ProtectedRoute() {
  const {
    user,
    initializing,
  } = useAuth();

  const { language } =
    useLanguage();

  if (initializing) {
    return (
      <div className={styles.loading}>
        {language === "ar"
          ? "جاري تحميل النظام..."
          : "Loading clinic system..."}
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Outlet />;
}
