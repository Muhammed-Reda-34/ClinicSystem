import type {
  ReactNode,
} from "react";

export type AppIconName =
  | "dashboard"
  | "patients"
  | "calendar"
  | "followUp"
  | "debt"
  | "tooth"
  | "services"
  | "lab"
  | "inventory"
  | "users"
  | "reports"
  | "audit"
  | "settings"
  | "logout"
  | "search"
  | "plus"
  | "edit"
  | "external"
  | "language"
  | "chevron"
  | "warning";

const paths:
  Record<
    AppIconName,
    ReactNode
  > = {
  dashboard: (
    <>
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="2"
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="2"
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="2"
      />
      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="2"
      />
    </>
  ),
  patients: (
    <>
      <circle
        cx="9"
        cy="8"
        r="4"
      />
      <path d="M3 21v-2a6 6 0 0 1 6-6h1" />
      <circle
        cx="17"
        cy="11"
        r="3"
      />
      <path d="M13 21v-1a4 4 0 0 1 8 0v1" />
    </>
  ),
  calendar: (
    <>
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
      />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  followUp: (
    <>
      <path d="M20 11a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v7h-7" />
    </>
  ),
  debt: (
    <>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />
      <path d="M3 10h18M8 15h2" />
    </>
  ),
  tooth: (
    <path d="M12 3c-2.7-2-6-.8-7.2 1.8C3.4 8 5.2 11 6 14c.7 2.8.7 7 2.6 7 1.5 0 1.5-4.2 3.4-4.2s1.9 4.2 3.4 4.2c1.9 0 1.9-4.2 2.6-7 .8-3 2.6-6 1.2-9.2C18 2.2 14.7 1 12 3Z" />
  ),
  services: (
    <>
      <path d="M12 3v18M3 12h18" />
      <circle
        cx="12"
        cy="12"
        r="9"
      />
    </>
  ),
  lab: (
    <>
      <path d="M9 3v6l-5 9a2 2 0 0 0 1.8 3h12.4a2 2 0 0 0 1.8-3l-5-9V3" />
      <path d="M7 14h10M8 3h8" />
    </>
  ),
  inventory: (
    <>
      <path d="M4 7h16v14H4z" />
      <path d="M2 3h20v4H2zM9 11h6" />
    </>
  ),
  users: (
    <>
      <circle
        cx="9"
        cy="8"
        r="4"
      />
      <path d="M3 21v-2a6 6 0 0 1 6-6h1" />
      <path d="M16 8h5M18.5 5.5v5" />
    </>
  ),
  reports: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  audit: (
    <>
      <path d="M6 3h12v18H6z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  settings: (
    <>
      <circle
        cx="12"
        cy="12"
        r="3"
      />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1V21H9.6v-.08A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H3V9.6h.08A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V3h4v.08A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.2.35.52.7.6 1 .08.3.08.6.08.6H21v4h-.08a1.7 1.7 0 0 0-1.52.4Z" />
    </>
  ),
  logout: (
    <>
      <path d="M10 17l5-5-5-5M15 12H3" />
      <path d="M14 3h7v18h-7" />
    </>
  ),
  search: (
    <>
      <circle
        cx="11"
        cy="11"
        r="7"
      />
      <path d="m20 20-4-4" />
    </>
  ),
  plus: (
    <path d="M12 5v14M5 12h14" />
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </>
  ),
  external: (
    <>
      <path d="M14 3h7v7M10 14 21 3" />
      <path d="M21 14v7H3V3h7" />
    </>
  ),
  language: (
    <>
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  chevron: (
    <path d="m9 18 6-6-6-6" />
  ),
  warning: (
    <>
      <path d="M12 3 2.5 20h19Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
};

export function AppIcon({
  name,
  size = 20,
}: {
  name: AppIconName;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
