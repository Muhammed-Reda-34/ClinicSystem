import axios from "axios";
import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AppIcon } from "../../../components/icons/AppIcon";
import { useLanguage } from "../../../i18n/LanguageContext";
import {
  createDoctor,
  createStaff,
  getDoctors,
  getStaff,
  replaceStaffDoctors,
} from "../api/usersApi";
import styles from "./UsersPage.module.css";

function generateTemporaryPassword() {
  const alphabet =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = new Uint32Array(10);
  crypto.getRandomValues(random);
  const body = Array.from(random)
    .map(value => alphabet[value % alphabet.length])
    .join("");

  return `Bd${body}7A`;
}

function apiErrorMessage(error: unknown, ar: boolean) {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;

    if (message) {
      if (ar && message.toLowerCase().includes("password")) {
        return "كلمة المرور لازم تكون 8 أحرف على الأقل وتحتوي حرف كبير + حرف صغير + رقم.";
      }
      if (ar && message.includes("Select at least one doctor")) {
        return "اختر طبيبًا واحدًا على الأقل.";
      }
      if (ar && message.includes("Email is already registered")) {
        return "البريد الإلكتروني مستخدم بالفعل.";
      }
      return message;
    }
  }

  return ar
    ? "تعذر إنشاء الحساب. راجع البيانات وحاول مرة أخرى."
    : "Unable to create the account. Review the fields and try again.";
}

const emptyDoctor = {
  fullName: "",
  email: "",
  password: "",
  specialization: "",
};

const emptyStaff = {
  fullName: "",
  email: "",
  password: "",
  role: "Secretary" as "Secretary" | "Nurse",
  doctorIds: [] as string[],
};

export function UsersPage() {
  const { language } = useLanguage();
  const ar = language === "ar";
  const client = useQueryClient();

  const doctorsQuery = useQuery({
    queryKey: ["admin", "doctors"],
    queryFn: getDoctors,
  });

  const staffQuery = useQuery({
    queryKey: ["admin", "staff"],
    queryFn: getStaff,
  });

  const [doctorForm, setDoctorForm] = useState(emptyDoctor);
  const [staffForm, setStaffForm] = useState(emptyStaff);
  const [doctorFormKey, setDoctorFormKey] = useState(0);
  const [staffFormKey, setStaffFormKey] = useState(0);
  const [doctorError, setDoctorError] = useState("");
  const [staffError, setStaffError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDoctorPassword, setShowDoctorPassword] = useState(false);
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingDoctorIds, setEditingDoctorIds] = useState<string[]>([]);

  const activeDoctors = useMemo(
    () => doctorsQuery.data?.filter(doctor => doctor.isActive) ?? [],
    [doctorsQuery.data],
  );

  const refreshUsers = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["admin", "doctors"] }),
      client.invalidateQueries({ queryKey: ["admin", "staff"] }),
      client.invalidateQueries({ queryKey: ["context", "doctors"] }),
    ]);
  };

  const doctorMutation = useMutation({
    mutationFn: createDoctor,
    onMutate: () => {
      setDoctorError("");
      setSuccess("");
    },
    onSuccess: async () => {
      setDoctorForm(emptyDoctor);
      setShowDoctorPassword(false);
      setDoctorFormKey(value => value + 1);
      setSuccess(ar ? "تم إنشاء حساب الطبيب وربطه بالعيادة بنجاح." : "Doctor account created successfully.");
      await refreshUsers();
    },
    onError: error => setDoctorError(apiErrorMessage(error, ar)),
  });

  const staffMutation = useMutation({
    mutationFn: createStaff,
    onMutate: () => {
      setStaffError("");
      setSuccess("");
    },
    onSuccess: async () => {
      setStaffForm({ ...emptyStaff, doctorIds: [] });
      setShowStaffPassword(false);
      setStaffFormKey(value => value + 1);
      setSuccess(ar ? "تم إنشاء حساب الموظف بنجاح." : "Staff account created successfully.");
      await refreshUsers();
    },
    onError: error => setStaffError(apiErrorMessage(error, ar)),
  });

  const assignmentMutation = useMutation({
    mutationFn: ({
      staffUserId,
      doctorIds,
    }: {
      staffUserId: string;
      doctorIds: string[];
    }) => replaceStaffDoctors(staffUserId, doctorIds),
    onSuccess: async () => {
      setEditingStaffId(null);
      setEditingDoctorIds([]);
      setSuccess(ar ? "تم تحديث ربط الموظف بالأطباء." : "Staff doctor assignment updated.");
      await refreshUsers();
    },
  });

  function submitDoctor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    doctorMutation.mutate({
      ...doctorForm,
      specialization: doctorForm.specialization.trim() || undefined,
    });
  }

  function submitStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    staffMutation.mutate(staffForm);
  }

  function toggleStaffDoctor(doctorId: string) {
    setStaffForm(current => ({
      ...current,
      doctorIds: current.doctorIds.includes(doctorId)
        ? current.doctorIds.filter(id => id !== doctorId)
        : [...current.doctorIds, doctorId],
    }));
  }

  function toggleEditingDoctor(doctorId: string) {
    setEditingDoctorIds(current =>
      current.includes(doctorId)
        ? current.filter(id => id !== doctorId)
        : [...current, doctorId],
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Owner Control</p>
          <h1>{ar ? "إدارة فريق العيادة" : "Clinic team management"}</h1>
          <p>
            {ar
              ? "هذه الصفحة متاحة للمالك فقط. من هنا يتم إنشاء الأطباء والسكرتارية والتمريض وربط الموظفين بالأطباء."
              : "Owner-only area for creating doctors, secretaries and nurses and managing staff-to-doctor assignments."}
          </p>
        </div>

        <div className={styles.counters}>
          <div>
            <span>{ar ? "الأطباء" : "Doctors"}</span>
            <strong>{doctorsQuery.data?.length ?? 0}</strong>
          </div>
          <div>
            <span>{ar ? "الموظفون" : "Staff"}</span>
            <strong>{staffQuery.data?.length ?? 0}</strong>
          </div>
        </div>
      </header>

      <div className={styles.ownerRule}>
        <AppIcon name="warning" />
        <div>
          <strong>{ar ? "صلاحية المالك فقط" : "Owner-only permission"}</strong>
          <span>
            {ar
              ? "أي طبيب يتم إنشاؤه هنا لا يستطيع إنشاء طبيب أو سكرتيرة أو ممرضة أخرى."
              : "Doctors created here cannot create other doctors, secretaries or nurses."}
          </span>
        </div>
      </div>

      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.formsGrid}>
        <form
          key={`doctor-${doctorFormKey}`}
          className={styles.formCard}
          onSubmit={submitDoctor}
          autoComplete="off"
        >
          <div className={styles.formHeader}>
            <span><AppIcon name="tooth" /></span>
            <div>
              <h2>{ar ? "إضافة طبيب" : "Add doctor"}</h2>
              <p>
                {ar
                  ? "ينشأ كطبيب عادي داخل العيادة، والمالك فقط يظل صاحب صلاحية إدارة المستخدمين."
                  : "Creates a regular clinic doctor. User management remains owner-only."}
              </p>
            </div>
          </div>

          <div className={styles.twoColumns}>
            <label>
              <span>{ar ? "اسم الطبيب" : "Doctor name"}</span>
              <input
                required
                autoComplete="off"
                value={doctorForm.fullName}
                onChange={event => setDoctorForm({ ...doctorForm, fullName: event.target.value })}
              />
            </label>

            <label>
              <span>{ar ? "التخصص — اختياري" : "Specialization — optional"}</span>
              <input
                maxLength={150}
                value={doctorForm.specialization}
                onChange={event => setDoctorForm({ ...doctorForm, specialization: event.target.value })}
              />
            </label>
          </div>

          <label>
            <span>{ar ? "البريد الإلكتروني" : "Email"}</span>
            <input
              required
              type="email"
              autoComplete="off"
              value={doctorForm.email}
              onChange={event => setDoctorForm({ ...doctorForm, email: event.target.value })}
            />
          </label>

          <label>
            <span>{ar ? "كلمة المرور المؤقتة" : "Temporary password"}</span>
            <input
              required
              minLength={8}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}"
              autoComplete="new-password"
              type={showDoctorPassword ? "text" : "password"}
              value={doctorForm.password}
              onChange={event => setDoctorForm({ ...doctorForm, password: event.target.value })}
            />
          </label>

          <div className={styles.passwordRow}>
            <button
              type="button"
              onClick={() => setDoctorForm({ ...doctorForm, password: generateTemporaryPassword() })}
            >
              {ar ? "توليد كلمة قوية" : "Generate password"}
            </button>
            <button type="button" onClick={() => setShowDoctorPassword(value => !value)}>
              {showDoctorPassword ? (ar ? "إخفاء" : "Hide") : (ar ? "إظهار" : "Show")}
            </button>
          </div>

          {doctorError && <div className={styles.error}>{doctorError}</div>}

          <button className={styles.primary} disabled={doctorMutation.isPending}>
            <AppIcon name="plus" />
            {doctorMutation.isPending
              ? (ar ? "جاري إنشاء الطبيب..." : "Creating doctor...")
              : (ar ? "إنشاء حساب الطبيب" : "Create doctor account")}
          </button>
        </form>

        <form
          key={`staff-${staffFormKey}`}
          className={styles.formCard}
          onSubmit={submitStaff}
          autoComplete="off"
        >
          <div className={styles.formHeader}>
            <span><AppIcon name="users" /></span>
            <div>
              <h2>{ar ? "إضافة سكرتيرة / ممرضة" : "Add secretary / nurse"}</h2>
              <p>
                {ar
                  ? "أنشئ حساب الموظف وحدد الطبيب أو الأطباء الذين يعمل معهم."
                  : "Create the staff account and choose the doctor or doctors they work with."}
              </p>
            </div>
          </div>

          <div className={styles.twoColumns}>
            <label>
              <span>{ar ? "الاسم بالكامل" : "Full name"}</span>
              <input
                required
                autoComplete="off"
                value={staffForm.fullName}
                onChange={event => setStaffForm({ ...staffForm, fullName: event.target.value })}
              />
            </label>

            <label>
              <span>{ar ? "البريد الإلكتروني" : "Email"}</span>
              <input
                required
                type="email"
                autoComplete="off"
                value={staffForm.email}
                onChange={event => setStaffForm({ ...staffForm, email: event.target.value })}
              />
            </label>
          </div>

          <div className={styles.twoColumns}>
            <label>
              <span>{ar ? "الوظيفة" : "Role"}</span>
              <select
                value={staffForm.role}
                onChange={event => setStaffForm({
                  ...staffForm,
                  role: event.target.value as "Secretary" | "Nurse",
                })}
              >
                <option value="Secretary">{ar ? "سكرتيرة" : "Secretary"}</option>
                <option value="Nurse">{ar ? "ممرضة" : "Nurse"}</option>
              </select>
            </label>

            <label>
              <span>{ar ? "كلمة المرور المؤقتة" : "Temporary password"}</span>
              <input
                required
                minLength={8}
                pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}"
                autoComplete="new-password"
                type={showStaffPassword ? "text" : "password"}
                value={staffForm.password}
                onChange={event => setStaffForm({ ...staffForm, password: event.target.value })}
              />
            </label>
          </div>

          <fieldset className={styles.doctorSelector}>
            <legend>{ar ? "تعمل مع أي طبيب؟" : "Works with which doctor?"}</legend>
            <div>
              {activeDoctors.map(doctor => (
                <label key={doctor.doctorId} className={styles.doctorOption}>
                  <input
                    type="checkbox"
                    checked={staffForm.doctorIds.includes(doctor.doctorId)}
                    onChange={() => toggleStaffDoctor(doctor.doctorId)}
                  />
                  <span>
                    <strong>{doctor.fullName}</strong>
                    <small>{doctor.specialization || (ar ? "طبيب" : "Doctor")}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className={styles.passwordRow}>
            <button
              type="button"
              onClick={() => setStaffForm({ ...staffForm, password: generateTemporaryPassword() })}
            >
              {ar ? "توليد كلمة قوية" : "Generate password"}
            </button>
            <button type="button" onClick={() => setShowStaffPassword(value => !value)}>
              {showStaffPassword ? (ar ? "إخفاء" : "Hide") : (ar ? "إظهار" : "Show")}
            </button>
          </div>

          <small className={styles.hint}>
            {ar
              ? "بعد الإنشاء يتم تفريغ جميع الحقول تلقائيًا."
              : "All fields are cleared automatically after creation."}
          </small>

          {staffError && <div className={styles.error}>{staffError}</div>}

          <button
            className={styles.primary}
            disabled={staffMutation.isPending || staffForm.doctorIds.length === 0}
          >
            <AppIcon name="plus" />
            {staffMutation.isPending
              ? (ar ? "جاري الإنشاء..." : "Creating...")
              : (ar ? "إنشاء حساب الموظف" : "Create staff account")}
          </button>
        </form>
      </div>

      <div className={styles.listsGrid}>
        <section className={styles.listCard}>
          <div className={styles.listHeader}>
            <div>
              <p className={styles.eyebrow}>Doctors</p>
              <h2>{ar ? "الأطباء" : "Doctors"}</h2>
            </div>
            <span>{doctorsQuery.data?.length ?? 0}</span>
          </div>

          <div className={styles.userList}>
            {doctorsQuery.data?.map(doctor => (
              <article key={doctor.doctorId}>
                <div className={styles.initial}>{doctor.fullName.trim().charAt(0)}</div>
                <div>
                  <strong>{doctor.fullName}</strong>
                  <span>{doctor.specialization || (ar ? "بدون تخصص محدد" : "No specialty")}</span>
                </div>
                <div className={styles.badges}>
                  {doctor.isOwner && <b>{ar ? "المالك" : "Owner"}</b>}
                  <em className={doctor.isActive ? styles.active : styles.inactive}>
                    {doctor.isActive ? (ar ? "نشط" : "Active") : (ar ? "غير نشط" : "Inactive")}
                  </em>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.listCard}>
          <div className={styles.listHeader}>
            <div>
              <p className={styles.eyebrow}>Staff</p>
              <h2>{ar ? "السكرتارية والتمريض" : "Secretary & nursing"}</h2>
            </div>
            <span>{staffQuery.data?.length ?? 0}</span>
          </div>

          <div className={styles.userList}>
            {staffQuery.data?.map(staff => (
              <article key={staff.userId} className={styles.staffRow}>
                <div className={styles.initial}>{staff.fullName.trim().charAt(0)}</div>
                <div>
                  <strong>{staff.fullName}</strong>
                  <span>
                    {staff.role === "Secretary"
                      ? (ar ? "سكرتيرة" : "Secretary")
                      : (ar ? "ممرضة" : "Nurse")}
                    {" • "}
                    {staff.doctors.map(doctor => doctor.fullName).join("، ") || "—"}
                  </span>
                </div>

                <button
                  type="button"
                  className={styles.editButton}
                  onClick={() => {
                    setEditingStaffId(staff.userId);
                    setEditingDoctorIds(staff.doctors.map(doctor => doctor.doctorId));
                  }}
                >
                  {ar ? "تعديل الربط" : "Edit assignment"}
                </button>

                {editingStaffId === staff.userId && (
                  <div className={styles.assignmentEditor}>
                    <strong>{ar ? "الأطباء المرتبطون" : "Assigned doctors"}</strong>
                    <div>
                      {activeDoctors.map(doctor => (
                        <label key={doctor.doctorId}>
                          <input
                            type="checkbox"
                            checked={editingDoctorIds.includes(doctor.doctorId)}
                            onChange={() => toggleEditingDoctor(doctor.doctorId)}
                          />
                          <span>{doctor.fullName}</span>
                        </label>
                      ))}
                    </div>
                    <div className={styles.editorActions}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStaffId(null);
                          setEditingDoctorIds([]);
                        }}
                      >
                        {ar ? "إلغاء" : "Cancel"}
                      </button>
                      <button
                        type="button"
                        className={styles.primarySmall}
                        disabled={assignmentMutation.isPending || editingDoctorIds.length === 0}
                        onClick={() => assignmentMutation.mutate({
                          staffUserId: staff.userId,
                          doctorIds: editingDoctorIds,
                        })}
                      >
                        {ar ? "حفظ" : "Save"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
