import { http } from "../../../lib/http";
import type {
  CreateTreatmentSessionPayload,
  CreateVisitPayload,
  DebtVisit,
  FollowUpVisit,
  PatientVisit,
  UpdateVisitPayload,
} from "../../../types/clinical";

export async function createPatientVisit(
  payload: CreateVisitPayload,
) {
  const response =
    await http.post<{
      visitId: string;
    }>(
      "/visits",
      payload,
    );

  return response.data;
}

export async function getPatientVisits(
  patientId: string,
) {
  const response =
    await http.get<PatientVisit[]>(
      `/visits/patient/${patientId}`,
    );

  return response.data;
}

export async function updatePatientVisit(
  visitId: string,
  payload: UpdateVisitPayload,
) {
  await http.put(
    `/visits/${visitId}`,
    payload,
  );
}

export async function deletePatientVisit(
  visitId: string,
  reason: string,
) {
  await http.delete(
    `/visits/${visitId}`,
    {
      data: { reason },
    },
  );
}

export async function createTreatmentSession(
  treatmentItemId: string,
  payload: CreateTreatmentSessionPayload,
) {
  const response = await http.post<{
    visitId: string;
  }>(
    `/visits/treatments/${treatmentItemId}/sessions`,
    payload,
  );

  return response.data;
}

export async function getFollowUpVisits(
  fromUtc: string,
  toUtc: string,
) {
  const response =
    await http.get<FollowUpVisit[]>(
      "/visits/follow-ups",
      {
        params: {
          fromUtc,
          toUtc,
        },
      },
    );

  return response.data;
}

export async function getDebtVisits() {
  const response =
    await http.get<DebtVisit[]>(
      "/visits/debts",
    );

  return response.data;
}

export async function addVisitPayment(
  visitId: string,
  amount: number,
  method?: string,
  notes?: string,
) {
  await http.post(
    `/visits/${visitId}/payments`,
    {
      amount,
      method: method || null,
      notes: notes || null,
    },
  );
}

export async function markFollowUpCompleted(
  visitId: string,
) {
  await http.put(
    `/visits/${visitId}/follow-up/completed`,
  );
}

export async function rescheduleFollowUp(
  visitId: string,
  followUpAtUtc: string,
  reason?: string,
) {
  await http.put(
    `/visits/${visitId}/follow-up/reschedule`,
    { followUpAtUtc, reason: reason || null },
  );
}
