import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { getDoctorProfilePhoto } from "../api/profileApi";
import styles from "./DoctorAvatar.module.css";

type Props = {
  size?: "small" | "medium" | "large";
  className?: string;
};

export function DoctorAvatar({
  size = "medium",
  className,
}: Props) {
  const { user, hasRole } = useAuth();

  const canHaveDoctorPhoto =
    hasRole("Owner") || hasRole("Doctor");

  const query = useQuery({
    // Important: scope the cached photo to the current authenticated user.
    // This prevents a previous doctor's photo from being reused after
    // logging in with another doctor account.
    queryKey: ["doctor-profile-photo", user],
    queryFn: getDoctorProfilePhoto,
    enabled: canHaveDoctorPhoto && !!user,
    staleTime: 5 * 60_000,
  });

  const photo = query.data;

  const src =
    photo?.hasPhoto &&
    photo.contentType &&
    photo.base64Data
      ? `data:${photo.contentType};base64,${photo.base64Data}`
      : null;

  return (
    <div
      className={[
        styles.avatar,
        styles[size],
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={user?.fullName ?? "Doctor"}
    >
      {src ? (
        <img
          src={src}
          alt={user?.fullName ?? "Doctor"}
        />
      ) : (
        <span>
          {user?.fullName
            ?.trim()
            .charAt(0)
            .toUpperCase() || "D"}
        </span>
      )}
    </div>
  );
}
