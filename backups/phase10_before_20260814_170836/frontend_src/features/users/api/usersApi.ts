import { http } from "../../../lib/http";
import type {
  DoctorListItem,
  StaffListItem,
} from "../../../types/users";

export const getDoctors =
  async () =>
    (
      await http.get<
        DoctorListItem[]
      >(
        "/admin/users/doctors",
      )
    ).data;

export const getStaff =
  async () =>
    (
      await http.get<
        StaffListItem[]
      >(
        "/admin/users/staff",
      )
    ).data;

export const createDoctor =
  (payload: {
    fullName: string;
    email: string;
    password: string;
    specialization?: string;
  }) =>
    http.post(
      "/admin/users/doctors",
      payload,
    );

export const createStaff =
  (payload: {
    fullName: string;
    email: string;
    password: string;
    role:
      | "Secretary"
      | "Nurse";
    doctorIds: string[];
  }) =>
    http.post(
      "/admin/users/staff",
      payload,
    );

export const replaceStaffDoctors =
  (
    staffUserId: string,
    doctorIds: string[],
  ) =>
    http.put(
      `/admin/users/staff/${staffUserId}/doctors`,
      {
        doctorIds,
      },
    );
