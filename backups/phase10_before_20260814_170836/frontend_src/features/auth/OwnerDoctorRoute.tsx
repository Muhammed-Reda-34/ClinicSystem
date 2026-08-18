import {
  Navigate,
  Outlet,
} from "react-router-dom";
import {
  useAuth,
} from "./AuthContext";

export function OwnerDoctorRoute() {
  const {
    hasRole,
  } =
    useAuth();

  return (
    hasRole("Owner")
    || hasRole("Doctor")
  )
    ? <Outlet />
    : (
      <Navigate
        to="/"
        replace
      />
    );
}
