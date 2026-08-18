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
    hasRole("Secretary")
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
