import { http } from "../../../lib/http";
import type {
  MedicalIntake,
  UpdateMedicalIntakePayload,
} from "../../../types/clinical";

export async function getMedicalIntake(
  patientId: string,
) {
  const response =
    await http.get<MedicalIntake>(
      `/patients/${patientId}/medical-intake`,
    );

  return response.data;
}

export async function updateMedicalIntake(
  patientId: string,
  payload: UpdateMedicalIntakePayload,
) {
  await http.put(
    `/patients/${patientId}/medical-intake`,
    payload,
  );
}
