import { http } from "../../../lib/http";
import type {
  AppointmentAttendanceStatus,
} from "../../../types/clinical";
import type {
  CreatePreliminaryBookingPayload,
  PreliminaryBooking,
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
    await http.post<{
      bookingId: string;
    }>(
      "/preliminary-bookings",
      payload,
    );

  return response.data;
}

export async function setPreliminaryBookingAttendance(
  bookingId: string,
  attendanceStatus: AppointmentAttendanceStatus,
) {
  await http.put(
    `/preliminary-bookings/${bookingId}/attendance`,
    { attendanceStatus },
  );
}
