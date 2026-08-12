export type AppointmentAttendanceStatus =
  | 0
  | 1
  | 2
  | 3
  | 4;

export type MedicalIntake = {
  patientId: string;
  fullName: string;
  phoneNumber: string;
  alternatePhone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  maritalStatus: string | null;
  occupation: string | null;
  address: string | null;

  hasDrugAllergy: boolean;
  drugAllergyDetails: string | null;

  hasHypertension: boolean;
  hasRheumaticFever: boolean;
  hasBloodDisease: boolean;
  hasLiverDisease: boolean;
  hasHepatitis: boolean;
  hasDiabetes: boolean;
  hasHeartDisease: boolean;
  hasKidneyDisease: boolean;
  hasThyroidDisease: boolean;
  hasCancer: boolean;

  otherConditions: string | null;

  hadRecentHospitalization: boolean;
  recentHospitalizationReason: string | null;

  medicalNotes: string | null;
  patientSignatureName: string | null;
  formDate: string | null;
  updatedAtUtc: string | null;
};

export type UpdateMedicalIntakePayload =
  Omit<
    MedicalIntake,
    | "patientId"
    | "updatedAtUtc"
  >;

export type Appointment = {
  id: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  phoneNumber: string;
  isBlacklisted: boolean;
  noShowCount: number;
  doctorId: string;
  doctorName: string;
  scheduledAtUtc: string;
  durationMinutes: number;
  attendanceStatus: AppointmentAttendanceStatus;
  reason: string | null;
  notes: string | null;
};

export type CreateAppointmentPayload = {
  patientId: string;
  doctorId: string;
  scheduledAtUtc: string;
  durationMinutes: number;
  reason?: string | null;
  notes?: string | null;
  allowBlacklisted: boolean;
};

export type DentalService = {
  id: string;
  code: string;
  category: string;
  nameAr: string;
  nameEn: string | null;
  currentPrice: number;
  pricingNoteAr: string | null;
  isActive: boolean;
  updatedAtUtc: string;
};

export type DentalServicePayload = {
  category: string;
  nameAr: string;
  nameEn?: string | null;
  currentPrice: number;
  pricingNoteAr?: string | null;
  isActive?: boolean;
};

export type PriceHistoryItem = {
  id: string;
  oldPrice: number;
  newPrice: number;
  changedByUserId: string;
  changedAtUtc: string;
};

export type CreateVisitTreatment = {
  dentalServiceId: string;
  quantity: number;
  toothNumbers: number[];
  notes?: string | null;
};

export type CreateVisitPayload = {
  patientId: string;
  doctorId: string;
  appointmentId?: string | null;
  visitDateUtc: string;
  clinicalNotes?: string | null;
  discountAmount: number;
  extraAmount: number;
  extraReason?: string | null;
  followUpAtUtc?: string | null;
  treatments: CreateVisitTreatment[];
  initialPayment: number;
  paymentMethod?: string | null;
};

export type VisitTreatment = {
  id: string;
  dentalServiceId: string | null;
  serviceNameAr: string;
  serviceNameEn: string | null;
  unitPrice: number;
  quantity: number;
  toothNumbers: number[];
  notes: string | null;
  lineTotal: number;
};

export type VisitPayment = {
  id: string;
  amount: number;
  method: string | null;
  notes: string | null;
  paidAtUtc: string;
};

export type PatientVisit = {
  id: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  visitDateUtc: string;
  clinicalNotes: string | null;
  subtotal: number;
  discountAmount: number;
  extraAmount: number;
  extraReason: string | null;
  total: number;
  paid: number;
  remaining: number;
  followUpAtUtc: string | null;
  treatments: VisitTreatment[];
  payments: VisitPayment[];
};

export type FollowUpVisit = {
  visitId: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  phoneNumber: string;
  doctorId: string;
  doctorName: string;
  followUpAtUtc: string;
  visitDateUtc: string;
};

export type DebtVisit = {
  visitId: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  phoneNumber: string;
  doctorId: string;
  doctorName: string;
  visitDateUtc: string;
  total: number;
  paid: number;
  remaining: number;
};
