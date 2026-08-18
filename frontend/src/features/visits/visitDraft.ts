export type VisitDraftTreatment = {
  dentalServiceId: string;
  quantity: number;
  toothNumbers: number[];
  notes: string | null;
  serviceName: string;
  unitPrice: number;
};

export type VisitDraft = {
  patientId: string;
  doctorId: string;
  appointmentId: string | null;
  treatments: VisitDraftTreatment[];
  clinicalNotes?: string | null;
  hasDeposit?: boolean;
  depositAmount?: number;
  depositPaymentMethod?: string | null;
};

function key(patientId: string) {
  return `clinic-visit-draft:${patientId}`;
}

export function loadVisitDraft(
  patientId: string,
): VisitDraft | null {
  try {
    const raw = window.sessionStorage.getItem(key(patientId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as VisitDraft;

    if (
      parsed.patientId !== patientId
      || !parsed.doctorId
      || !Array.isArray(parsed.treatments)
    ) {
      return null;
    }

    return {
      ...parsed,
      clinicalNotes: parsed.clinicalNotes ?? null,
      hasDeposit: parsed.hasDeposit ?? false,
      depositAmount: parsed.depositAmount ?? 0,
      depositPaymentMethod: parsed.depositPaymentMethod ?? null,
    };
  } catch {
    return null;
  }
}

export function saveVisitDraft(draft: VisitDraft) {
  window.sessionStorage.setItem(
    key(draft.patientId),
    JSON.stringify(draft),
  );
}

export function clearVisitDraft(patientId: string) {
  window.sessionStorage.removeItem(key(patientId));
}
