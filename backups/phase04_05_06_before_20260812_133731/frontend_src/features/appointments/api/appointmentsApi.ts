import { http } from "../../../lib/http";
import type {
  Appointment,
  AppointmentAttendanceStatus,
  CreateAppointmentPayload,
} from "../../../types/clinical";

export async function getAppointments(
  fromUtc: string,
  toUtc: string,
) {
  const response =
    await http.get<Appointment[]>(
      "/appointments",
      {
        params: {
          fromUtc,
          toUtc,
        },
      },
    );

  return response.data;
}

export async function createAppointment(
  payload: CreateAppointmentPayload,
) {
  const response =
    await http.post<{
      appointmentId: string;
    }>(
      "/appointments",
      payload,
    );

  return response.data;
}

export async function setAppointmentAttendance(
  appointmentId: string,
  attendanceStatus:
    AppointmentAttendanceStatus,
) {
  await http.put(
    `/appointments/${appointmentId}/attendance`,
    {
      attendanceStatus,
    },
  );
}
