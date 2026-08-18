import {
  Navigate,
  Outlet,
} from "react-router-dom";
import {
  useAuth,
} from "./AuthContext";

export function StaffBookingRoute() {
  const {
    hasRole,
  } = useAuth();

  return (
    hasRole("Owner")
    || hasRole("Doctor")
    || hasRole("Secretary")
    || hasRole("Nurse")
  )
    ? <Outlet />
    : (
      <Navigate
        to="/"
        replace
      />
    );
}
