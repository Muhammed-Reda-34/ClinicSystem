import {
  StrictMode,
} from "react";
import {
  createRoot,
} from "react-dom/client";
import {
  RouterProvider,
} from "react-router-dom";
import {
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  AuthProvider,
} from "./features/auth/AuthContext";
import {
  DoctorProvider,
} from "./features/context/DoctorContext";
import {
  LanguageProvider,
} from "./i18n/LanguageContext";
import {
  queryClient,
} from "./app/queryClient";
import {
  router,
} from "./app/router";

import "./styles/tokens.css";
import "./styles/reset.css";
import "./styles/global.css";

createRoot(
  document.getElementById(
    "root",
  )!,
).render(
  <StrictMode>
    <QueryClientProvider
      client={queryClient}
    >
      <LanguageProvider>
        <AuthProvider>
          <DoctorProvider>
            <RouterProvider
              router={router}
            />
          </DoctorProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </StrictMode>,
);
