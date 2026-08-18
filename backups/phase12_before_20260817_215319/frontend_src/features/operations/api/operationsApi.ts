import { http } from "../../../lib/http";

export type VisitBrowseItem = {
  visitId: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  phoneNumber: string;
  doctorId: string;
  doctorName: string;
  visitDateUtc: string;
  treatmentSummary: string;
  teethSummary: string;
  total: number;
  paid: number;
  remaining: number;
  followUpAtUtc: string | null;
};

export async function getRecentVisits(params?: {
  search?: string;
  fromUtc?: string;
  toUtc?: string;
  take?: number;
}) {
  const response =
    await http.get<VisitBrowseItem[]>(
      "/operations/visits",
      { params },
    );

  return response.data;
}

export async function removePatientFromBlacklist(
  patientId: string,
) {
  await http.post(
    `/operations/patients/${patientId}/remove-blacklist`,
  );
}

export async function rescheduleAppointment(
  appointmentId: string,
  payload: {
    scheduledAtUtc: string;
    durationMinutes: number;
    notes?: string | null;
  },
) {
  await http.put(
    `/operations/appointments/${appointmentId}/reschedule`,
    payload,
  );
}

export async function deleteVisitPayment(
  visitId: string,
  paymentId: string,
) {
  await http.delete(
    `/operations/visits/${visitId}/payments/${paymentId}`,
  );
}


export async function archivePatient(
  patientId: string,
) {
  await http.post(
    `/operations/patients/${patientId}/archive`,
  );
}
