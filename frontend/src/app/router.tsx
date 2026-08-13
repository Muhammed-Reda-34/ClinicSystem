import {
  createBrowserRouter,
} from "react-router-dom";
import {
  DashboardLayout,
} from "../layouts/DashboardLayout";
import {
  ProtectedRoute,
} from "../features/auth/ProtectedRoute";
import {
  OwnerRoute,
} from "../features/auth/OwnerRoute";
import {
  OwnerDoctorRoute,
} from "../features/auth/OwnerDoctorRoute";
import {
  LoginPage,
} from "../features/auth/pages/LoginPage";
import {
  DashboardPage,
} from "../features/dashboard/pages/DashboardPage";
import {
  UsersPage,
} from "../features/users/pages/UsersPage";
import {
  PatientsPage,
} from "../features/patients/pages/PatientsPage";
import {
  BlacklistPage,
} from "../features/patients/pages/BlacklistPage";
import {
  PatientCreatePage,
} from "../features/patients/pages/PatientCreatePage";
import {
  PatientProfilePage,
} from "../features/patients/pages/PatientProfilePage";
import {
  PatientEditPage,
} from "../features/patients/pages/PatientEditPage";
import {
  MedicalIntakePage,
} from "../features/medical/pages/MedicalIntakePage";
import {
  AppointmentsPage,
} from "../features/appointments/pages/AppointmentsPage";
import {
  ServicesPage,
} from "../features/services/pages/ServicesPage";
import {
  VisitCreatePage,
} from "../features/visits/pages/VisitCreatePage";
import {
  DebtsPage,
} from "../features/visits/pages/DebtsPage";
import {
  FollowUpsPage,
} from "../features/visits/pages/FollowUpsPage";
import {
  VisitsPage,
} from "../features/operations/pages/VisitsPage";
import {
  LabPage,
} from "../features/lab/pages/LabPage";
import {
  InventoryPage,
} from "../features/inventory/pages/InventoryPage";
import {
  ReportsPage,
} from "../features/finance/pages/ReportsPage";
import {
  AuditPage,
} from "../features/audit/pages/AuditPage";
import {
  SettingsPage,
} from "../features/settings/pages/SettingsPage";
import {
  PatientRecordsPage,
} from "../features/patientFiles/pages/PatientRecordsPage";
import {
  ApprovalsPage,
} from "../features/approvals/pages/ApprovalsPage";

export const router =
  createBrowserRouter([
    {
      path: "/login",
      Component: LoginPage,
    },
    {
      Component:
        ProtectedRoute,
      children: [
        {
          Component:
            DashboardLayout,
          children: [
            {
              index: true,
              Component:
                DashboardPage,
            },
            {
              path:
                "patients",
              Component:
                PatientsPage,
            },
            {
              path:
                "blacklist",
              Component:
                BlacklistPage,
            },
            {
              path:
                "patients/new",
              Component:
                PatientCreatePage,
            },
            {
              path:
                "patients/:patientId",
              Component:
                PatientProfilePage,
            },
            {
              path:
                "patients/:patientId/edit",
              Component:
                PatientEditPage,
            },
            {
              path:
                "patients/:patientId/medical-intake",
              Component:
                MedicalIntakePage,
            },
            {
              path:
                "patients/:patientId/visits/new",
              Component:
                VisitCreatePage,
            },
            {
              path:
                "patients/:patientId/records",
              Component:
                PatientRecordsPage,
            },
            {
              path:
                "appointments",
              Component:
                AppointmentsPage,
            },
            {
              path:
                "follow-ups",
              Component:
                FollowUpsPage,
            },
            {
              path:
                "debts",
              Component:
                DebtsPage,
            },
            {
              path:
                "visits",
              Component:
                VisitsPage,
            },
            {
              path:
                "services",
              Component:
                ServicesPage,
            },
            {
              path:
                "lab",
              Component:
                LabPage,
            },
            {
              path:
                "inventory",
              Component:
                InventoryPage,
            },
            {
              Component:
                OwnerDoctorRoute,
              children: [
                {
                  path:
                    "approvals",
                  Component:
                    ApprovalsPage,
                },
                {
                  path:
                    "reports",
                  Component:
                    ReportsPage,
                },
                {
                  path:
                    "settings",
                  Component:
                    SettingsPage,
                },
              ],
            },
            {
              Component:
                OwnerRoute,
              children: [
                {
                  path:
                    "users",
                  Component:
                    UsersPage,
                },
                {
                  path:
                    "audit",
                  Component:
                    AuditPage,
                },

              ],
            },
          ],
        },
      ],
    },
  ]);
