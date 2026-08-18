export type PatientProfileStatus =
  | 1
  | 2
  | 3
  | "PreRegistered"
  | "BasicCompleted"
  | "MedicalCompleted";

export type PatientDoctor = {
  doctorId: string;
  fullName: string;
};

export type PatientListItem = {
  id: string;
  patientCode: string;
  formNumber: string | null;
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  age: number | null;
  profileStatus: PatientProfileStatus;
  isBlacklisted: boolean;
  noShowCount: number;
  doctors: PatientDoctor[];
};

export type PatientDetails = PatientListItem & {
  gender: string | null;
  address: string | null;
  administrativeNotes: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type PagedPatients = {
  page: number;
  pageSize: number;
  totalCount: number;
  items: PatientListItem[];
};

export type PhoneMatch = {
  id: string;
  patientCode: string;
  fullName: string;
  phoneNumber: string;
  isBlacklisted: boolean;
};

export type PhoneCheck = {
  exists: boolean;
  hasHiddenClinicMatch: boolean;
  visibleMatches: PhoneMatch[];
};

export type PatientPayload = {
  fullName: string;
  phoneNumber: string;
  formNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  administrativeNotes?: string | null;
  doctorIds: string[];
};

export type UpdatePatientPayload =
  PatientPayload & {
    markBasicCompleted: boolean;
  };
