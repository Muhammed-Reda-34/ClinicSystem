import {
  useState,
  type FormEvent,
} from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../AuthContext";
import { AppIcon } from "../../../components/icons/AppIcon";
import { useLanguage } from "../../../i18n/LanguageContext";
import styles from "./LoginPage.module.css";

export function LoginPage() {
  const { user, login } = useAuth();
  const { language, toggleLanguage } =
    useLanguage();

  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  if (user) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      await login(
        email,
        password,
      );

      const target =
        (
          location.state as
            | {
                from?: string;
              }
            | null
        )?.from
        ?? "/";

      navigate(
        target,
        {
          replace: true,
        },
      );
    } catch {
      setError(
        language === "ar"
          ? "البريد الإلكتروني أو كلمة المرور غير صحيحة."
          : "Invalid email or password.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.visualPanel}>
        <div className={styles.brand}>
          Blue Dahab
        </div>

        <div className={styles.arabicTitle}>
          لا حول ولا قوة إلا بالله
        </div>

        <p className={styles.visualText}>
          {language === "ar"
            ? "نظام إدارة عيادة الأسنان"
            : "Dental Clinic Management System"}
        </p>

        <div
          className={styles.decorativeTooth}
          aria-hidden="true"
        >
          <AppIcon
            name="tooth"
            size={78}
          />
        </div>
      </section>

      <section className={styles.formPanel}>
        <button
          type="button"
          className={styles.languageButton}
          onClick={toggleLanguage}
        >
          {language === "ar"
            ? "English"
            : "العربية"}
        </button>

        <div className={styles.formWrap}>
          <p className={styles.eyebrow}>
            Blue Dahab Clinic
          </p>

          <h1>
            {language === "ar"
              ? "تسجيل الدخول"
              : "Sign in"}
          </h1>

          <p className={styles.subtitle}>
            {language === "ar"
              ? "ادخل إلى حسابك للمتابعة."
              : "Access your clinic workspace."}
          </p>

          <form
            className={styles.form}
            onSubmit={handleSubmit}
          >
            <label className={styles.field}>
              <span>
                {language === "ar"
                  ? "البريد الإلكتروني"
                  : "Email"}
              </span>

              <input
                type="email"
                value={email}
                onChange={event =>
                  setEmail(
                    event.target.value,
                  )
                }
                required
                autoComplete="email"
              />
            </label>

            <label className={styles.field}>
              <span>
                {language === "ar"
                  ? "كلمة المرور"
                  : "Password"}
              </span>

              <input
                type="password"
                value={password}
                onChange={event =>
                  setPassword(
                    event.target.value,
                  )
                }
                required
                autoComplete="current-password"
              />
            </label>

            {error && (
              <div
                className={styles.error}
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              className={styles.submit}
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? (
                  language === "ar"
                    ? "جاري الدخول..."
                    : "Signing in..."
                )
                : (
                  language === "ar"
                    ? "دخول"
                    : "Sign in"
                )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
