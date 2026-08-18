import { http } from "../../../lib/http";
import type {
  AppointmentAttendanceStatus,
} from "../../../types/clinical";
import type {
  CreatePreliminaryBookingPayload,
  PreliminaryBooking,
  PreliminaryBookingWriteResponse,
} from "../../../types/preliminaryBookings";

export async function getPreliminaryBookings(
  date: string,
) {
  const response =
    await http.get<PreliminaryBooking[]>(
      "/preliminary-bookings",
      {
        params: { date },
      },
    );

  return response.data;
}

export async function createPreliminaryBooking(
  payload: CreatePreliminaryBookingPayload,
) {
  const response =
    await http.post<PreliminaryBookingWriteResponse>(
      "/preliminary-bookings",
      payload,
    );

  return response.data;
}

export async function setPreliminaryBookingAttendance(
  bookingId: string,
  attendanceStatus: AppointmentAttendanceStatus,
) {
  const response = await http.put<PreliminaryBookingWriteResponse>(
    `/preliminary-bookings/${bookingId}/attendance`,
    { attendanceStatus },
  );

  return response.data;
}
