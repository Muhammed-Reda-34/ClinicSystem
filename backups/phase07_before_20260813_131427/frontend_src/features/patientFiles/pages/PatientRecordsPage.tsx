import { useMemo, useState, type FormEvent } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useDoctorContext } from "../../context/DoctorContext";
import { useLanguage } from "../../../i18n/LanguageContext";
import { getPatient } from "../../patients/api/patientsApi";
import {
  addClinicalNote,
  deletePatientAttachment,
  downloadPatientAttachment,
  getClinicalNotes,
  getPatientAttachments,
  uploadPatientAttachment,
} from "../api/patientFilesApi";
import styles from "./PatientRecordsPage.module.css";

const categories = [
  { value: 1, ar: "أشعة", en: "X-Ray" },
  { value: 2, ar: "روشتة", en: "Prescription" },
  { value: 3, ar: "ملف طبي", en: "Medical file" },
  { value: 4, ar: "صورة", en: "Photo" },
  { value: 5, ar: "أخرى", en: "Other" },
];

function categoryLabel(value: number | string, ar: boolean) {
  const numeric = Number(value);
  const found = categories.find(x => x.value === numeric);
  return found ? (ar ? found.ar : found.en) : String(value);
}

function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function PatientRecordsPage() {
  const { patientId } = useParams();
  const { language } = useLanguage();
  const ar = language === "ar";
  const { hasRole } = useAuth();
  const {
    doctors,
    selectedDoctor,
  } = useDoctorContext();
  const client = useQueryClient();

  const canUseClinicalNotes =
    hasRole("Owner") || hasRole("Doctor");

  const patientQuery = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatient(patientId!),
    enabled: Boolean(patientId),
  });

  const attachmentsQuery = useQuery({
    queryKey: ["patient-attachments", patientId],
    queryFn: () => getPatientAttachments(patientId!),
    enabled: Boolean(patientId),
  });

  const notesQuery = useQuery({
    queryKey: ["patient-clinical-notes", patientId],
    queryFn: () => getClinicalNotes(patientId!),
    enabled: Boolean(patientId) && canUseClinicalNotes,
  });

  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState(1);
  const [fileNotes, setFileNotes] = useState("");
  const [noteText, setNoteText] = useState("");

  const noteDoctorId =
    selectedDoctor?.doctorId
    ?? doctors[0]?.doctorId
    ?? "";

  const currentDoctorId =
    selectedDoctor?.doctorId
    ?? null;

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !patientId) return;

      const form = new FormData();
      form.append("file", file);
      form.append("category", String(category));

      if (currentDoctorId) {
        form.append("doctorId", currentDoctorId);
      }

      if (fileNotes.trim()) {
        form.append("notes", fileNotes.trim());
      }

      await uploadPatientAttachment(patientId, form);
    },
    onSuccess: async () => {
      setFile(null);
      setFileNotes("");
      await client.invalidateQueries({
        queryKey: ["patient-attachments", patientId],
      });
    },
  });

  const noteMutation = useMutation({
    mutationFn: () =>
      addClinicalNote(
        patientId!,
        {
          doctorId: noteDoctorId,
          noteText,
        },
      ),
    onSuccess: async () => {
      setNoteText("");
      await client.invalidateQueries({
        queryKey: ["patient-clinical-notes", patientId],
      });
    },
  });

  const patient = patientQuery.data;

  const uploadAccept =
    "application/pdf,image/jpeg,image/png,image/webp";

  const doctorName = useMemo(
    () =>
      doctors.find(x => x.doctorId === noteDoctorId)?.fullName
      ?? "",
    [doctors, noteDoctorId],
  );

  function submitUpload(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    uploadMutation.mutate();
  }

  function submitNote(event: FormEvent) {
    event.preventDefault();
    if (!noteText.trim() || !noteDoctorId) return;
    noteMutation.mutate();
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Patient Records</p>
          <h1>
            {ar ? "ملفات المريض وملاحظات الطبيب" : "Patient Files & Clinical Notes"}
          </h1>
          <p>
            {patient
              ? `${patient.fullName} — ${patient.patientCode}`
              : (ar ? "جاري تحميل المريض..." : "Loading patient...")}
          </p>
        </div>

        {patientId && (
          <Link to={`/patients/${patientId}`}>
            {ar ? "العودة للبروفايل" : "Back to profile"}
          </Link>
        )}
      </header>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>{ar ? "رفع أشعة / روشتة / ملف" : "Upload attachment"}</h2>

          <form className={styles.form} onSubmit={submitUpload}>
            <label>
              <span>{ar ? "النوع" : "Category"}</span>
              <select
                value={category}
                onChange={e => setCategory(Number(e.target.value))}
              >
                {categories.map(item => (
                  <option key={item.value} value={item.value}>
                    {ar ? item.ar : item.en}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{ar ? "الملف - حتى 10MB" : "File - up to 10MB"}</span>
              <input
                type="file"
                accept={uploadAccept}
                onChange={e =>
                  setFile(e.target.files?.[0] ?? null)
                }
              />
            </label>

            <label>
              <span>{ar ? "ملاحظات" : "Notes"}</span>
              <textarea
                rows={3}
                value={fileNotes}
                onChange={e => setFileNotes(e.target.value)}
              />
            </label>

            <small>
              {ar
                ? "المسموح: PDF / JPEG / PNG / WEBP. يتم فحص توقيع الملف في الباك وليس الامتداد فقط."
                : "Allowed: PDF / JPEG / PNG / WEBP. The backend validates file signatures."}
            </small>

            <button
              disabled={!file || uploadMutation.isPending}
            >
              {ar ? "رفع الملف" : "Upload"}
            </button>
          </form>
        </section>

        {canUseClinicalNotes && (
          <section className={styles.card}>
            <h2>{ar ? "ملاحظة طبيب" : "Doctor clinical note"}</h2>

            <form className={styles.form} onSubmit={submitNote}>
              <div className={styles.doctorContext}>
                <span>{ar ? "الطبيب" : "Doctor"}</span>
                <strong>{doctorName || "—"}</strong>
              </div>

              <label>
                <span>{ar ? "الملاحظة" : "Clinical note"}</span>
                <textarea
                  rows={7}
                  maxLength={5000}
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                />
              </label>

              <button
                disabled={
                  !noteText.trim()
                  || !noteDoctorId
                  || noteMutation.isPending
                }
              >
                {ar ? "حفظ الملاحظة" : "Save note"}
              </button>
            </form>
          </section>
        )}
      </div>

      <section className={styles.card}>
        <h2>{ar ? "ملفات المريض" : "Patient attachments"}</h2>

        <div className={styles.attachments}>
          {attachmentsQuery.data?.map(item => (
            <article key={item.id}>
              <div className={styles.fileIcon}>
                {item.contentType === "application/pdf" ? "PDF" : "IMG"}
              </div>

              <div className={styles.fileInfo}>
                <strong>{item.originalFileName}</strong>
                <span>
                  {categoryLabel(item.category, ar)}
                  {" • "}
                  {sizeLabel(item.sizeBytes)}
                </span>
                <small>
                  {new Date(item.uploadedAtUtc).toLocaleString(
                    ar ? "ar-EG" : "en-GB",
                  )}
                </small>
              </div>

              <div className={styles.fileActions}>
                <button
                  type="button"
                  onClick={() =>
                    void downloadPatientAttachment(
                      patientId!,
                      item.id,
                      item.originalFileName,
                    )
                  }
                >
                  {ar ? "تحميل" : "Download"}
                </button>

                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={async () => {
                    await deletePatientAttachment(
                      patientId!,
                      item.id,
                    );
                    await client.invalidateQueries({
                      queryKey: ["patient-attachments", patientId],
                    });
                  }}
                >
                  {ar ? "حذف" : "Delete"}
                </button>
              </div>
            </article>
          ))}

          {attachmentsQuery.data?.length === 0 && (
            <div className={styles.empty}>
              {ar ? "لا توجد ملفات مرفوعة." : "No attachments."}
            </div>
          )}
        </div>
      </section>

      {canUseClinicalNotes && (
        <section className={styles.card}>
          <h2>{ar ? "سجل ملاحظات الأطباء" : "Doctor notes history"}</h2>

          <div className={styles.notes}>
            {notesQuery.data?.map(note => (
              <article key={note.id}>
                <div>
                  <strong>{note.doctorName}</strong>
                  <time>
                    {new Date(note.createdAtUtc).toLocaleString(
                      ar ? "ar-EG" : "en-GB",
                    )}
                  </time>
                </div>
                <p>{note.noteText}</p>
              </article>
            ))}

            {notesQuery.data?.length === 0 && (
              <div className={styles.empty}>
                {ar ? "لا توجد ملاحظات طبية." : "No clinical notes."}
              </div>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
