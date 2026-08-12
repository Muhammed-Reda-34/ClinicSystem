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
  PatientCreatePage,
} from "../features/patients/pages/PatientCreatePage";
import {
  PatientProfilePage,
} from "../features/patients/pages/PatientProfilePage";
import {
  PatientEditPage,
} from "../features/patients/pages/PatientEditPage";
import {
  ComingSoonPage,
} from "../features/shared/pages/ComingSoonPage";

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
                "appointments",
              Component:
                ComingSoonPage,
            },
            {
              path:
                "follow-ups",
              Component:
                ComingSoonPage,
            },
            {
              path:
                "debts",
              Component:
                ComingSoonPage,
            },
            {
              path:
                "visits",
              Component:
                ComingSoonPage,
            },
            {
              path:
                "services",
              Component:
                ComingSoonPage,
            },
            {
              path:
                "lab",
              Component:
                ComingSoonPage,
            },
            {
              path:
                "inventory",
              Component:
                ComingSoonPage,
            },
            {
              path:
                "reports",
              Component:
                ComingSoonPage,
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
                    ComingSoonPage,
                },
                {
                  path:
                    "settings",
                  Component:
                    ComingSoonPage,
                },
              ],
            },
          ],
        },
      ],
    },
  ]);
