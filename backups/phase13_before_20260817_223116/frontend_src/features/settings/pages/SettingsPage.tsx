import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  useAuth,
} from "../../auth/AuthContext";
import {
  useLanguage,
} from "../../../i18n/LanguageContext";
import {
  DoctorAvatar,
} from "../../profile/components/DoctorAvatar";
import {
  deleteDoctorProfilePhoto,
  updateDoctorProfilePhoto,
} from "../../profile/api/profileApi";
import {
  getClinicSettings,
  updateClinicSettings,
} from "../api/settingsApi";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
  const {
    language,
  } =
    useLanguage();

  const {
    hasRole,
  } =
    useAuth();

  const ar =
    language === "ar";

  const isOwner =
    hasRole("Owner");

  const canManagePhoto =
    hasRole("Owner")
    || hasRole("Doctor");

  const client =
    useQueryClient();

  const settingsQuery =
    useQuery({
      queryKey:
        ["clinic-settings"],
      queryFn:
        getClinicSettings,
      staleTime:
        5 * 60_000,
    });

  const [form, setForm] =
    useState({
      clinicName:
        "Blue Dahab",
      headerInvocationAr:
        "لا حول ولا قوة إلا بالله",
      currencyCode:
        "EGP",
      appointmentReminderTemplateAr:
        "",
      appointmentReminderTemplateEn:
        "",
    });

  const [
    selectedPhoto,
    setSelectedPhoto,
  ] =
    useState<File | null>(
      null,
    );

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    setForm({
      clinicName:
        settingsQuery.data
        .clinicName,
      headerInvocationAr:
        settingsQuery.data
        .headerInvocationAr,
      currencyCode:
        settingsQuery.data
        .currencyCode,
      appointmentReminderTemplateAr:
        settingsQuery.data
        .appointmentReminderTemplateAr,
      appointmentReminderTemplateEn:
        settingsQuery.data
        .appointmentReminderTemplateEn,
    });
  }, [settingsQuery.data]);

  const settingsMutation =
    useMutation({
      mutationFn: () =>
        updateClinicSettings(
          form,
        ),
      onSuccess:
        async () => {
          await client
            .invalidateQueries({
              queryKey:
                ["clinic-settings"],
            });
        },
    });

  const photoMutation =
    useMutation({
      mutationFn:
        async () => {
          if (!selectedPhoto) {
            return;
          }

          await updateDoctorProfilePhoto(
            selectedPhoto,
          );
        },
      onSuccess:
        async () => {
          setSelectedPhoto(
            null,
          );

          await client
            .invalidateQueries({
              queryKey:
                [
                  "doctor-profile-photo",
                ],
            });
        },
    });

  const deletePhotoMutation =
    useMutation({
      mutationFn:
        deleteDoctorProfilePhoto,
      onSuccess:
        async () => {
          await client
            .invalidateQueries({
              queryKey:
                [
                  "doctor-profile-photo",
                ],
            });
        },
    });

  function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!isOwner) {
      return;
    }

    settingsMutation.mutate();
  }

  return (
    <section className={styles.page}>
      <header>
        <p className={styles.eyebrow}>
          Settings
        </p>

        <h1>
          {ar
            ? "الإعدادات"
            : "Settings"}
        </h1>

        <p>
          {ar
            ? "الصورة الشخصية للطبيب وإعدادات العيادة."
            : "Doctor profile image and clinic settings."}
        </p>
      </header>

      {canManagePhoto && (
        <section className={styles.photoCard}>
          <div className={styles.photoPreview}>
            <DoctorAvatar
              size="large"
            />

            <div>
              <h2>
                {ar
                  ? "صورة الطبيب"
                  : "Doctor photo"}
              </h2>

              <p>
                {ar
                  ? "نفس الصورة ستظهر في لوحة التحكم وأسفل القائمة الجانبية بجانب اسم الطبيب."
                  : "The same photo appears on the dashboard and next to the doctor name in the sidebar."}
              </p>
            </div>
          </div>

          <div className={styles.photoControls}>
            <label className={styles.filePicker}>
              <span>
                {ar
                  ? "اختيار صورة"
                  : "Choose image"}
              </span>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={event =>
                  setSelectedPhoto(
                    event.target
                      .files?.[0]
                    ?? null,
                  )
                }
              />
            </label>

            {selectedPhoto && (
              <small>
                {selectedPhoto.name}
                {" • "}
                {(
                  selectedPhoto.size
                  / 1024
                  / 1024
                ).toFixed(2)}
                {" MB"}
              </small>
            )}

            <div className={styles.photoActions}>
              <button
                type="button"
                className={styles.primary}
                disabled={
                  !selectedPhoto
                  || photoMutation
                    .isPending
                }
                onClick={() =>
                  photoMutation
                    .mutate()
                }
              >
                {ar
                  ? "حفظ الصورة"
                  : "Save photo"}
              </button>

              <button
                type="button"
                className={styles.danger}
                disabled={
                  deletePhotoMutation
                    .isPending
                }
                onClick={() =>
                  deletePhotoMutation
                    .mutate()
                }
              >
                {ar
                  ? "حذف الصورة"
                  : "Remove photo"}
              </button>
            </div>

            <small className={styles.hint}>
              {ar
                ? "JPEG / PNG / WEBP — الحد الأقصى 5MB."
                : "JPEG / PNG / WEBP — max 5MB."}
            </small>
          </div>
        </section>
      )}

      {isOwner && (
        <form
          className={styles.card}
          onSubmit={submit}
        >
          <h2>
            {ar
              ? "إعدادات العيادة"
              : "Clinic settings"}
          </h2>

          <div className={styles.grid}>
            <label>
              <span>
                {ar
                  ? "اسم العيادة"
                  : "Clinic name"}
              </span>

              <input
                required
                value={
                  form.clinicName
                }
                onChange={event =>
                  setForm({
                    ...form,
                    clinicName:
                      event.target
                        .value,
                  })
                }
              />
            </label>

            <label>
              <span>
                {ar
                  ? "العملة"
                  : "Currency"}
              </span>

              <input
                required
                maxLength={10}
                value={
                  form.currencyCode
                }
                onChange={event =>
                  setForm({
                    ...form,
                    currencyCode:
                      event.target
                        .value,
                  })
                }
              />
            </label>

            <label className={styles.full}>
              <span>
                {ar
                  ? "عبارة الهيدر"
                  : "Header invocation"}
              </span>

              <input
                required
                value={
                  form.headerInvocationAr
                }
                onChange={event =>
                  setForm({
                    ...form,
                    headerInvocationAr:
                      event.target
                        .value,
                  })
                }
              />
            </label>

            <label className={styles.full}>
              <span>
                {ar
                  ? "رسالة تذكير عربية"
                  : "Arabic reminder template"}
              </span>

              <textarea
                rows={4}
                value={
                  form
                  .appointmentReminderTemplateAr
                }
                onChange={event =>
                  setForm({
                    ...form,
                    appointmentReminderTemplateAr:
                      event.target
                        .value,
                  })
                }
              />
            </label>

            <label className={styles.full}>
              <span>
                {ar
                  ? "رسالة تذكير إنجليزية"
                  : "English reminder template"}
              </span>

              <textarea
                rows={4}
                value={
                  form
                  .appointmentReminderTemplateEn
                }
                onChange={event =>
                  setForm({
                    ...form,
                    appointmentReminderTemplateEn:
                      event.target
                        .value,
                  })
                }
              />
            </label>
          </div>

          <button
            className={styles.primary}
            disabled={
              settingsMutation
                .isPending
            }
          >
            {ar
              ? "حفظ الإعدادات"
              : "Save settings"}
          </button>

          {settingsMutation.isSuccess && (
            <small className={styles.success}>
              {ar
                ? "تم الحفظ."
                : "Saved."}
            </small>
          )}
        </form>
      )}
    </section>
  );
}
