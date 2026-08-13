import { http } from "../../../lib/http";
import type {
  PatientAttachment,
  PatientClinicalNote,
} from "../../../types/operations";

export async function getPatientAttachments(patientId: string) {
  const r = await http.get<PatientAttachment[]>(
    `/patients/${patientId}/attachments`,
  );
  return r.data;
}

export async function uploadPatientAttachment(
  patientId: string,
  form: FormData,
) {
  await http.post(
    `/patients/${patientId}/attachments`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
}

export async function deletePatientAttachment(
  patientId: string,
  attachmentId: string,
) {
  await http.delete(
    `/patients/${patientId}/attachments/${attachmentId}`,
  );
}

export async function downloadPatientAttachment(
  patientId: string,
  attachmentId: string,
  fileName: string,
) {
  const r = await http.get(
    `/patients/${patientId}/attachments/${attachmentId}/download`,
    { responseType: "blob" },
  );

  const url = URL.createObjectURL(r.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function getClinicalNotes(patientId: string) {
  const r = await http.get<PatientClinicalNote[]>(
    `/patients/${patientId}/clinical-notes`,
  );
  return r.data;
}

export async function addClinicalNote(
  patientId: string,
  payload: { doctorId: string; noteText: string },
) {
  await http.post(
    `/patients/${patientId}/clinical-notes`,
    payload,
  );
}
