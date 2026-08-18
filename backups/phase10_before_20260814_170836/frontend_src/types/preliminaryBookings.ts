import type {
  AppointmentAttendanceStatus,
} from "./clinical";

export type PreliminaryBooking = {
  id: string;
  patientName: string;
  phoneNumber: string;
  visitDate: string | null;
  visitTime: string | null;
  attendanceStatus: AppointmentAttendanceStatus;
  createdByUserId: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type CreatePreliminaryBookingPayload = {
  patientName: string;
  phoneNumber: string;
  visitDate?: string | null;
  visitTime?: string | null;
};
