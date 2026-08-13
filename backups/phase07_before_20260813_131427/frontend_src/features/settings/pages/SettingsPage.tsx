import { useEffect, useState, type FormEvent } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLanguage } from "../../../i18n/LanguageContext";
import {
  getClinicSettings,
  updateClinicSettings,
} from "../api/settingsApi";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
  const { language } = useLanguage();
  const ar = language === "ar";
  const client = useQueryClient();

  const query = useQuery({
    queryKey: ["clinic-settings"],
    queryFn: getClinicSettings,
  });

  const [form, setForm] = useState({
    clinicName: "Blue Dahab",
    headerInvocationAr: "لا حول ولا قوة إلا بالله",
    currencyCode: "EGP",
    appointmentReminderTemplateAr: "",
    appointmentReminderTemplateEn: "",
  });

  useEffect(() => {
    if (!query.data) return;

    setForm({
      clinicName: query.data.clinicName,
      headerInvocationAr: query.data.headerInvocationAr,
      currencyCode: query.data.currencyCode,
      appointmentReminderTemplateAr:
        query.data.appointmentReminderTemplateAr,
      appointmentReminderTemplateEn:
        query.data.appointmentReminderTemplateEn,
    });
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: () => updateClinicSettings(form),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: ["clinic-settings"],
      });
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <section className={styles.page}>
      <header>
        <p className={styles.eyebrow}>Settings</p>
        <h1>{ar ? "إعدادات العيادة" : "Clinic Settings"}</h1>
        <p>
          {ar
            ? "الهوية الأساسية والعملة ورسائل التذكير الجاهزة."
            : "Clinic identity, currency and reminder templates."}
        </p>
      </header>

      <form className={styles.card} onSubmit={submit}>
        <div className={styles.grid}>
          <label>
            <span>{ar ? "اسم العيادة" : "Clinic name"}</span>
            <input
              required
              value={form.clinicName}
              onChange={e =>
                setForm({ ...form, clinicName: e.target.value })
              }
            />
          </label>

          <label>
            <span>{ar ? "العملة" : "Currency"}</span>
            <input
              required
              maxLength={10}
              value={form.currencyCode}
              onChange={e =>
                setForm({ ...form, currencyCode: e.target.value })
              }
            />
          </label>

          <label className={styles.full}>
            <span>{ar ? "عبارة الهيدر" : "Header invocation"}</span>
            <input
              required
              value={form.headerInvocationAr}
              onChange={e =>
                setForm({ ...form, headerInvocationAr: e.target.value })
              }
            />
          </label>

          <label className={styles.full}>
            <span>{ar ? "رسالة تذكير عربية" : "Arabic reminder template"}</span>
            <textarea
              rows={4}
              value={form.appointmentReminderTemplateAr}
              onChange={e =>
                setForm({
                  ...form,
                  appointmentReminderTemplateAr: e.target.value,
                })
              }
            />
          </label>

          <label className={styles.full}>
            <span>{ar ? "رسالة تذكير إنجليزية" : "English reminder template"}</span>
            <textarea
              rows={4}
              value={form.appointmentReminderTemplateEn}
              onChange={e =>
                setForm({
                  ...form,
                  appointmentReminderTemplateEn: e.target.value,
                })
              }
            />
          </label>
        </div>

        <button disabled={mutation.isPending}>
          {ar ? "حفظ الإعدادات" : "Save settings"}
        </button>

        {mutation.isSuccess && (
          <small className={styles.success}>
            {ar ? "تم الحفظ." : "Saved."}
          </small>
        )}
      </form>
    </section>
  );
}
