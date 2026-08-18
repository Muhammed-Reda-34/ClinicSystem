import axios from "axios";
import { useMemo, useState, type FormEvent } from "react";
import styles from "./SystemProvisioningPage.module.css";

type DoctorItem = {
  doctorId: string;
  fullName: string;
  specialization: string;
  isOwner: boolean;
  isActive: boolean;
};

type AccountRole = "Doctor" | "Secretary" | "Nurse";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5081/api/v1";
const provisioningHttp = axios.create({ baseURL });

function generateTemporaryPassword() {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = new Uint32Array(10);
  crypto.getRandomValues(random);
  const body = Array.from(random)
    .map(value => alphabet[value % alphabet.length])
    .join("");
  return `Bd${body}7A`;
}

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message === "Invalid provisioning access key.") {
      return "مفتاح الدخول غير صحيح.";
    }
    if (message === "Provisioning portal is disabled.") {
      return "بوابة إنشاء الحسابات الخارجية غير مفعلة حاليًا.";
    }
    if (message?.includes("Email is already registered")) {
      return "البريد الإلكتروني مستخدم بالفعل.";
    }
    if (message) {
      return message;
    }
  }
  return "تعذر تنفيذ العملية. راجع البيانات وحاول مرة أخرى.";
}

export function SystemProvisioningPage() {
  const [accessKey, setAccessKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [role, setRole] = useState<AccountRole>("Doctor");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [doctorIds, setDoctorIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const activeDoctors = useMemo(
    () => doctors.filter(doctor => doctor.isActive),
    [doctors],
  );

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await provisioningHttp.post<DoctorItem[]>(
        "/system-provisioning/doctors/list",
        { accessKey },
      );
      setDoctors(response.data);
      setUnlocked(true);
    } catch (err) {
      setUnlocked(false);
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setFullName("");
    setEmail("");
    setSpecialization("");
    setPassword("");
    setDoctorIds([]);
    setShowPassword(false);
  }

  async function refreshDoctors() {
    const response = await provisioningHttp.post<DoctorItem[]>(
      "/system-provisioning/doctors/list",
      { accessKey },
    );
    setDoctors(response.data);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      if (role === "Doctor") {
        await provisioningHttp.post("/system-provisioning/doctors", {
          accessKey,
          fullName,
          email,
          password,
          specialization: specialization || undefined,
        });
        setSuccess("تم إنشاء حساب الطبيب بنجاح.");
        await refreshDoctors();
      } else {
        if (doctorIds.length === 0) {
          setError("اختر طبيبًا واحدًا على الأقل للموظف.");
          return;
        }
        await provisioningHttp.post("/system-provisioning/staff", {
          accessKey,
          fullName,
          email,
          password,
          role,
          doctorIds,
        });
        setSuccess(role === "Secretary" ? "تم إنشاء حساب السكرتيرة بنجاح." : "تم إنشاء حساب الممرضة بنجاح.");
      }
      resetForm();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function toggleDoctor(doctorId: string) {
    setDoctorIds(current =>
      current.includes(doctorId)
        ? current.filter(id => id !== doctorId)
        : [...current, doctorId],
    );
  }

  return (
    <main className={styles.page} dir="rtl">
      <section className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.logo}>BD</div>
          <div>
            <span className={styles.kicker}>Blue Dahab · System Administration</span>
            <h1>بوابة إنشاء الحسابات الخارجية</h1>
            <p>
              بوابة منفصلة عن لوحة العيادة. لا تظهر في السايدبار، وتحتاج مفتاح إدارة خاص قبل إنشاء أي حساب.
            </p>
          </div>
        </header>

        {!unlocked ? (
          <form className={styles.accessCard} onSubmit={unlock}>
            <div>
              <span className={styles.step}>01</span>
              <h2>فتح بوابة الإدارة</h2>
              <p>أدخل مفتاح الإدارة الخارجية الذي تم إنشاؤه على جهاز السيرفر.</p>
            </div>
            <label>
              <span>مفتاح الإدارة</span>
              <input
                type="password"
                value={accessKey}
                onChange={event => setAccessKey(event.target.value)}
                autoComplete="off"
                required
              />
            </label>
            {error && <div className={styles.error}>{error}</div>}
            <button className={styles.primary} disabled={busy}>
              {busy ? "جاري التحقق..." : "دخول البوابة"}
            </button>
          </form>
        ) : (
          <>
            <div className={styles.unlockedBar}>
              <div>
                <strong>البوابة مفتوحة</strong>
                <span>يمكن إنشاء طبيب أو سكرتيرة أو ممرضة من هنا فقط.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUnlocked(false);
                  setAccessKey("");
                  resetForm();
                  setSuccess("");
                  setError("");
                }}
              >
                قفل البوابة
              </button>
            </div>

            <form className={styles.formCard} onSubmit={submit} autoComplete="off">
              <div className={styles.formTitle}>
                <span className={styles.step}>02</span>
                <div>
                  <h2>إنشاء حساب جديد</h2>
                  <p>حدد نوع الحساب ثم أدخل بياناته.</p>
                </div>
              </div>

              <div className={styles.roleGrid}>
                {(["Doctor", "Secretary", "Nurse"] as AccountRole[]).map(item => (
                  <button
                    key={item}
                    type="button"
                    className={role === item ? styles.roleActive : styles.roleButton}
                    onClick={() => {
                      setRole(item);
                      setDoctorIds([]);
                      setSuccess("");
                      setError("");
                    }}
                  >
                    <strong>
                      {item === "Doctor" ? "طبيب" : item === "Secretary" ? "سكرتيرة" : "ممرضة"}
                    </strong>
                    <span>
                      {item === "Doctor" ? "حساب طبيب جديد" : "حساب تشغيلي للعيادة"}
                    </span>
                  </button>
                ))}
              </div>

              <div className={styles.twoColumns}>
                <label>
                  <span>الاسم بالكامل</span>
                  <input
                    required
                    value={fullName}
                    onChange={event => setFullName(event.target.value)}
                    autoComplete="off"
                  />
                </label>

                <label>
                  <span>البريد الإلكتروني</span>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    autoComplete="off"
                  />
                </label>
              </div>

              {role === "Doctor" && (
                <label>
                  <span>التخصص — اختياري</span>
                  <input
                    value={specialization}
                    onChange={event => setSpecialization(event.target.value)}
                    autoComplete="off"
                  />
                </label>
              )}

              {role !== "Doctor" && (
                <fieldset className={styles.doctorSelector}>
                  <legend>الطبيب / الأطباء المسؤولون</legend>
                  {activeDoctors.length === 0 ? (
                    <p className={styles.empty}>لا يوجد طبيب نشط. أنشئ طبيبًا أولًا.</p>
                  ) : (
                    <div className={styles.doctorGrid}>
                      {activeDoctors.map(doctor => (
                        <label key={doctor.doctorId}>
                          <input
                            type="checkbox"
                            checked={doctorIds.includes(doctor.doctorId)}
                            onChange={() => toggleDoctor(doctor.doctorId)}
                          />
                          <span>
                            <strong>{doctor.fullName}</strong>
                            <small>{doctor.specialization || "طبيب"}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </fieldset>
              )}

              <label>
                <span>كلمة المرور المؤقتة</span>
                <div className={styles.passwordField}>
                  <input
                    required
                    minLength={8}
                    pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(value => !value)}>
                    {showPassword ? "إخفاء" : "إظهار"}
                  </button>
                </div>
              </label>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => setPassword(generateTemporaryPassword())}
                >
                  توليد كلمة مرور قوية
                </button>
                <button
                  className={styles.primary}
                  disabled={busy || (role !== "Doctor" && doctorIds.length === 0)}
                >
                  {busy ? "جاري الإنشاء..." : "إنشاء الحساب"}
                </button>
              </div>

              <small className={styles.hint}>
                كلمة المرور: 8 أحرف على الأقل وتحتوي حرفًا كبيرًا وحرفًا صغيرًا ورقمًا.
              </small>

              {error && <div className={styles.error}>{error}</div>}
              {success && <div className={styles.success}>{success}</div>}
            </form>
          </>
        )}
      </section>
    </main>
  );
}
