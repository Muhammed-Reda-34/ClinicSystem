import type {
  AppointmentAttendanceStatus,
} from "./clinical";

export type PreliminaryBooking = {
  id: string;
  patientId: string | null;
  patientCode: string | null;
  patientProfileStatus: number | null;
  patientName: string;
  phoneNumber: string;
  visitDate: string | null;
  visitTime: string | null;
  attendanceStatus: AppointmentAttendanceStatus;
  isBlacklisted: boolean;
  noShowCount: number;
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

export type PreliminaryBookingWriteResponse = {
  bookingId: string;
  patientId: string | null;
  wasExistingPatient?: boolean;
  isBlacklisted: boolean;
  noShowCount: number;
};
