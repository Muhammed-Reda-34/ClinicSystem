export type Language =
  | "ar"
  | "en";

const ar = {
  brand: "Blue Dahab",
  invocation:
    "لا حول ولا قوة إلا بالله",
  dashboard: "لوحة التحكم",
  patients: "المرضى",
  appointments: "المواعيد",
  followUps: "المتابعات",
  debts: "المبالغ المستحقة",
  visits: "الزيارات والعلاج",
  services: "الخدمات والأسعار",
  lab: "المعمل",
  inventory: "الجرد والمخزون",
  users: "المستخدمون",
  reports: "الحسابات والتقارير",
  audit: "سجل العمليات",
  settings: "الإعدادات",
  logout: "تسجيل الخروج",
  language: "English",
  doctorContext: "الطبيب الحالي",
  allDoctors: "كل الأطباء",
  welcome: "أهلاً",
  systemReady:
    "لوحة إدارة العيادة",
  comingSoon: "قريبًا",
  patientsTitle: "إدارة المرضى",
  patientsSubtitle:
    "تسجيل سريع، بحث، وتحديث ملف المريض.",
  addPatient: "إضافة مريض",
  searchPlaceholder:
    "ابحث بالاسم أو الهاتف أو رقم الاستمارة أو الكود...",
  noPatients:
    "لا توجد نتائج مطابقة.",
  patient: "المريض",
  patientCode: "كود المريض",
  formNumber: "رقم الاستمارة",
  phone: "رقم الهاتف",
  age: "العمر",
  doctors: "الأطباء",
  status: "الحالة",
  actions: "الإجراءات",
  open: "فتح",
  edit: "تعديل",
  whatsapp: "واتساب",
  blacklisted: "قائمة عدم الالتزام",
  preRegistered: "تسجيل مبدئي",
  basicCompleted: "بيانات أساسية مكتملة",
  medicalCompleted: "ملف طبي مكتمل",
  fullName: "الاسم بالكامل",
  dateOfBirth: "تاريخ الميلاد",
  gender: "النوع",
  male: "ذكر",
  female: "أنثى",
  address: "العنوان",
  notes: "ملاحظات إدارية",
  save: "حفظ",
  saving: "جاري الحفظ...",
  cancel: "إلغاء",
  required: "مطلوب",
  chooseDoctor:
    "اختر طبيبًا واحدًا على الأقل",
  phoneExists:
    "رقم الهاتف موجود بالفعل.",
  duplicatePatient:
    "يوجد مريض بنفس الاسم ورقم الهاتف.",
  formExists:
    "رقم الاستمارة مستخدم بالفعل.",
  hiddenPhoneMatch:
    "هذا الرقم مسجل داخل العيادة في نطاق طبيب آخر.",
  blacklistWarning:
    "تنبيه: هذا المريض موجود في قائمة عدم الالتزام.",
  profile: "ملف المريض",
  basicInformation:
    "البيانات الأساسية",
  medicalInformation:
    "البيانات الصحية",
  medicalFormPending:
    "الفورم الطبي الكامل سيتم إضافته عند استلام بياناته.",
  visitsHistory:
    "سجل الزيارات",
  visitsPending:
    "وحدة الزيارات والفك التفاعلي في المرحلة التالية.",
  createdAt: "تاريخ التسجيل",
  years: "سنة",
  completeBasicData:
    "استكمال البيانات الأساسية",
  quickRegistration:
    "تسجيل مبدئي سريع",
  fullRegistration:
    "بيانات كاملة",
  markBasicCompleted:
    "اعتبار البيانات الأساسية مكتملة",
  totalPatients: "إجمالي المرضى",
  todayAppointments: "مواعيد اليوم",
  todayFollowUps: "متابعات اليوم",
  outstandingBalances:
    "المبالغ المستحقة",
  loading: "جاري التحميل...",
  retry: "إعادة المحاولة",
  previous: "السابق",
  next: "التالي",
  page: "صفحة",
  of: "من",
  active: "نشط",
  ownerDoctor: "Owner + Doctor",
  doctor: "طبيب",
  secretary: "سكرتيرة",
  nurse: "ممرضة",
  administration:
    "إدارة المستخدمين",
  addDoctor: "إضافة طبيب",
  addStaff: "إضافة سكرتيرة / ممرضة",
  specialization: "التخصص",
  email: "البريد الإلكتروني",
  temporaryPassword:
    "كلمة المرور المؤقتة",
  role: "الوظيفة",
  worksWith: "تعمل مع أي طبيب؟",
  add: "إضافة",
  doctorsList: "الأطباء",
  staffList:
    "السكرتارية والتمريض",
  noData: "لا توجد بيانات",
} as const;

export type TranslationKey =
  keyof typeof ar;

const en: Record<
  TranslationKey,
  string
> = {
  brand: "Blue Dahab",
  invocation:
    "There is no power nor strength except through Allah",
  dashboard: "Dashboard",
  patients: "Patients",
  appointments: "Appointments",
  followUps: "Follow-ups",
  debts: "Outstanding balances",
  visits: "Visits & Treatment",
  services: "Services & Pricing",
  lab: "Laboratory",
  inventory: "Inventory",
  users: "Users",
  reports: "Finance & Reports",
  audit: "Audit Log",
  settings: "Settings",
  logout: "Log out",
  language: "العربية",
  doctorContext: "Current doctor",
  allDoctors: "All doctors",
  welcome: "Welcome",
  systemReady:
    "Clinic management dashboard",
  comingSoon: "Coming soon",
  patientsTitle:
    "Patient Management",
  patientsSubtitle:
    "Quick registration, search and patient profile updates.",
  addPatient: "Add patient",
  searchPlaceholder:
    "Search by name, phone, form number or code...",
  noPatients:
    "No matching patients.",
  patient: "Patient",
  patientCode: "Patient code",
  formNumber: "Form number",
  phone: "Phone",
  age: "Age",
  doctors: "Doctors",
  status: "Status",
  actions: "Actions",
  open: "Open",
  edit: "Edit",
  whatsapp: "WhatsApp",
  blacklisted:
    "Non-compliance list",
  preRegistered:
    "Pre-registered",
  basicCompleted:
    "Basic data completed",
  medicalCompleted:
    "Medical file completed",
  fullName: "Full name",
  dateOfBirth: "Date of birth",
  gender: "Gender",
  male: "Male",
  female: "Female",
  address: "Address",
  notes: "Administrative notes",
  save: "Save",
  saving: "Saving...",
  cancel: "Cancel",
  required: "Required",
  chooseDoctor:
    "Select at least one doctor",
  phoneExists:
    "This phone number already exists.",
  duplicatePatient:
    "A patient with the same name and phone already exists.",
  formExists:
    "This form number is already in use.",
  hiddenPhoneMatch:
    "This phone is already registered under another doctor scope.",
  blacklistWarning:
    "Warning: this patient is on the non-compliance list.",
  profile: "Patient profile",
  basicInformation:
    "Basic information",
  medicalInformation:
    "Medical information",
  medicalFormPending:
    "The complete medical form will be added when its fields are provided.",
  visitsHistory:
    "Visit history",
  visitsPending:
    "Visits and the interactive odontogram are coming in the next phase.",
  createdAt: "Registered",
  years: "years",
  completeBasicData:
    "Complete basic data",
  quickRegistration:
    "Quick pre-registration",
  fullRegistration:
    "Full registration",
  markBasicCompleted:
    "Mark basic data as completed",
  totalPatients:
    "Total patients",
  todayAppointments:
    "Today's appointments",
  todayFollowUps:
    "Today's follow-ups",
  outstandingBalances:
    "Outstanding balances",
  loading: "Loading...",
  retry: "Retry",
  previous: "Previous",
  next: "Next",
  page: "Page",
  of: "of",
  active: "Active",
  ownerDoctor: "Owner + Doctor",
  doctor: "Doctor",
  secretary: "Secretary",
  nurse: "Nurse",
  administration:
    "User administration",
  addDoctor: "Add doctor",
  addStaff: "Add secretary / nurse",
  specialization: "Specialization",
  email: "Email",
  temporaryPassword:
    "Temporary password",
  role: "Role",
  worksWith:
    "Works with which doctor?",
  add: "Add",
  doctorsList: "Doctors",
  staffList:
    "Secretary & Nursing",
  noData: "No data",
};

export const translations = {
  ar,
  en,
} satisfies Record<
  Language,
  Record<TranslationKey, string>
>;
