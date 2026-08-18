import { http } from "../../../lib/http";

export type ApprovalRequestItem = {
  id: string;
  requestType: string;
  entityType: string;
  entityId: string;
  requestedAction: string;
  status: number | string;
  requestedByUserId: string;
  requestedByName: string;
  requiredDoctorId: string;
  requiredDoctorName: string;
  requestedAtUtc: string;
  expiresAtUtc: string;
  payloadJson: string | null;
};

export async function getPendingApprovals() {
  const response =
    await http.get<ApprovalRequestItem[]>(
      "/approvals/pending",
    );

  return response.data;
}

export async function getPendingApprovalCount() {
  const response =
    await http.get<{
      count: number;
    }>(
      "/approvals/pending/count",
    );

  return response.data.count;
}

export async function requestPatientDeletion(
  patientId: string,
  doctorId: string,
) {
  const response =
    await http.post<{
      approvalRequestId: string;
      expiresInHours: number;
    }>(
      `/approvals/patient/${patientId}/delete`,
      {
        doctorId,
      },
    );

  return response.data;
}

export async function requestAttachmentDeletion(
  attachmentId: string,
  doctorId: string,
) {
  const response =
    await http.post<{
      approvalRequestId: string;
      expiresInHours: number;
    }>(
      "/approvals/attachment/delete",
      {
        attachmentId,
        doctorId,
      },
    );

  return response.data;
}

export async function approveRequest(
  requestId: string,
  note?: string,
) {
  await http.post(
    `/approvals/${requestId}/approve`,
    {
      note: note || null,
    },
  );
}

export async function rejectRequest(
  requestId: string,
  note?: string,
) {
  await http.post(
    `/approvals/${requestId}/reject`,
    {
      note: note || null,
    },
  );
}
