export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentQuantity: number;
  reorderLevel: number;
  averageUnitCost: number | null;
  isLowStock: boolean;
  isActive: boolean;
};

export type InventoryTransaction = {
  id: string;
  inventoryItemId: string;
  itemName: string;
  type: number | string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  unitCostSnapshot: number | null;
  estimatedCost: number | null;
  notes: string | null;
  createdByUserId: string;
  createdAtUtc: string;
};

export type LabPatientLookupVisit = {
  visitId: string;
  visitDateUtc: string;
  doctorId: string;
  doctorName: string;
};

export type LabPatientLookup = {
  patientId: string;
  patientCode: string;
  formNumber: string | null;
  fullName: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  age: number | null;
  gender: string | null;
  address: string | null;
  isBlacklisted: boolean;
  recentVisits: LabPatientLookupVisit[];
};

export type LabOrder = {
  id: string;
  serialNumber: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  visitId: string | null;
  visitDateUtc: string | null;
  caseDescription: string | null;
  workTypes: string[];
  toothNumbers: number[];
  materialOptions: string[];
  shade: string | null;
  digitalPhotosSent: boolean;
  valueLevel: string | null;
  occlusalStaining: string | null;
  instructions: string | null;
  createdAtUtc: string;
};

export type LabExpense = {
  id: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  visitId: string | null;
  visitDateUtc: string | null;
  labOrderId: string | null;
  serviceOrItemName: string;
  amount: number;
  expenseDateUtc: string;
  notes: string | null;
  createdByUserId: string;
  createdAtUtc: string;
};

export type MonthlyFinancialReport = {
  year: number;
  month: number;
  isClinicWide: boolean;
  billedTreatment: number;
  collectedRevenue: number;
  outstandingFromMonthVisits: number;
  manualExpenses: number;
  labExpenses: number;
  inventoryConsumptionCost: number;
  payrollCost: number;
  totalExpenses: number;
  netCashMovement: number;
};

export type DashboardData = {
  totalPatients: number;
  todayAppointments: number;
  todayNoShows: number;
  todayFollowUps: number;
  lowStockItems: number;
  collectedRevenueThisMonth: number | null;
  expensesThisMonth: number | null;
  netThisMonth: number | null;
  outstandingBalances: number | null;
};

export type ClinicExpense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  expenseDateUtc: string;
  notes: string | null;
  createdByUserId: string;
  createdAtUtc: string;
};

export type SalaryProfile = {
  userId: string;
  fullName: string;
  role: string;
  baseSalary: number;
  effectiveFrom: string | null;
  isSalaryProfileActive: boolean;
};

export type PayrollRow = {
  userId: string;
  fullName: string;
  role: string;
  baseSalary: number;
  increases: number;
  bonuses: number;
  deductions: number;
  netSalary: number;
};

export type AccountingPeriod = {
  id: string;
  year: number;
  month: number;
  status: number | string;
  closedAtUtc: string | null;
  reopenedAtUtc: string | null;
};

export type AuditLogItem = {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValuesJson: string | null;
  newValuesJson: string | null;
  ipAddress: string | null;
  createdAtUtc: string;
};

export type PagedAuditLogs = {
  page: number;
  pageSize: number;
  totalCount: number;
  items: AuditLogItem[];
};

export type PatientAttachment = {
  id: string;
  patientId: string;
  doctorId: string | null;
  category: number | string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  notes: string | null;
  uploadedByUserId: string;
  uploadedAtUtc: string;
};

export type PatientClinicalNote = {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  noteText: string;
  createdByUserId: string;
  createdAtUtc: string;
};

export type ClinicSetting = {
  id: string;
  clinicName: string;
  headerInvocationAr: string;
  currencyCode: string;
  appointmentReminderTemplateAr: string;
  appointmentReminderTemplateEn: string;
  updatedAtUtc: string;
};
