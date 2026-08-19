import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import type {
  AuthResponse,
} from "../types/auth";
import {
  getAccessToken,
  setAccessToken,
} from "./authToken";
import {
  getSelectedDoctorId,
} from "./doctorScopeStore";

const configuredBaseURL =
  import.meta.env.VITE_API_BASE_URL?.trim();

if (
  import.meta.env.PROD
  && !configuredBaseURL
) {
  throw new Error(
    "VITE_API_BASE_URL is required in production.",
  );
}

const baseURL =
  configuredBaseURL
  ?? "http://localhost:5081/api/v1";

const clientHeaders = {
  "X-Clinic-Client":
    "BlueDahabWeb",
};

export const http =
  axios.create({
    baseURL,
    withCredentials: true,
    headers: clientHeaders,
  });

const refreshClient =
  axios.create({
    baseURL,
    withCredentials: true,
    headers: clientHeaders,
  });

let refreshPromise:
  Promise<AuthResponse>
  | null = null;

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise =
      refreshClient
      .post<AuthResponse>(
        "/auth/refresh",
      )
      .then(
        (response) => {
          setAccessToken(
            response.data
              .accessToken,
          );

          window.dispatchEvent(
            new CustomEvent(
              "clinic:auth-refreshed",
              {
                detail:
                  response.data,
              },
            ),
          );

          return response.data;
        },
      )
      .catch(
        (error) => {
          setAccessToken(null);

          window.dispatchEvent(
            new Event(
              "clinic:auth-logout",
            ),
          );

          throw error;
        },
      )
      .finally(
        () => {
          refreshPromise =
            null;
        },
      );
  }

  return refreshPromise;
}

http.interceptors.request.use(
  (
    config:
      InternalAxiosRequestConfig,
  ) => {
    const token =
      getAccessToken();

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    const doctorId =
      getSelectedDoctorId();

    if (doctorId) {
      config.headers[
        "X-Doctor-Id"
      ] = doctorId;
    }

    return config;
  },
);

http.interceptors.response.use(
  (response) => response,
  async (
    error: AxiosError,
  ) => {
    const originalRequest =
      error.config as
        | (
            InternalAxiosRequestConfig
            & {
              _retry?: boolean;
            }
          )
        | undefined;

    if (
      error.response?.status
        !== 401
      || !originalRequest
      || originalRequest._retry
      || originalRequest.url
        ?.includes(
          "/auth/login",
        )
      || originalRequest.url
        ?.includes(
          "/auth/refresh",
        )
    ) {
      return Promise.reject(
        error,
      );
    }

    originalRequest._retry =
      true;

    await refreshSession();

    const token =
      getAccessToken();

    if (token) {
      originalRequest
        .headers
        .Authorization =
        `Bearer ${token}`;
    }

    return http(
      originalRequest,
    );
  },
);

export async function
  bootstrapAuthSession() {
  return refreshSession();
}
