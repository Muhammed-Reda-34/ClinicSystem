import { http } from "../../../lib/http";
import type {
  PagedPatients,
  PatientDetails,
  PatientPayload,
  PhoneCheck,
  UpdatePatientPayload,
} from "../../../types/patients";

export async function getPatients(
  params: {
    search?: string;
    page?: number;
    pageSize?: number;
    blacklisted?: boolean;
  },
) {
  const response =
    await http.get<PagedPatients>(
      "/patients",
      {
        params,
      },
    );

  return response.data;
}

export async function getPatient(
  patientId: string,
) {
  const response =
    await http.get<PatientDetails>(
      `/patients/${patientId}`,
    );

  return response.data;
}

export async function checkPatientPhone(
  phone: string,
) {
  const response =
    await http.get<PhoneCheck>(
      "/patients/check-phone",
      {
        params: {
          phone,
        },
      },
    );

  return response.data;
}

export async function createPatient(
  payload: PatientPayload,
) {
  const response =
    await http.post<{
      patientId: string;
    }>(
      "/patients",
      payload,
    );

  return response.data;
}

export async function updatePatient(
  patientId: string,
  payload: UpdatePatientPayload,
) {
  await http.put(
    `/patients/${patientId}`,
    payload,
  );
}
