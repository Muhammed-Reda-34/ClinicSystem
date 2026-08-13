import { http } from "../../../lib/http";

export type DoctorProfilePhoto = {
  hasPhoto: boolean;
  contentType: string | null;
  base64Data: string | null;
  updatedAtUtc: string | null;
};

export async function getDoctorProfilePhoto() {
  const response =
    await http.get<DoctorProfilePhoto>(
      "/profile/doctor-photo",
    );

  return response.data;
}

export async function updateDoctorProfilePhoto(
  file: File,
) {
  const form =
    new FormData();

  form.append(
    "file",
    file,
  );

  await http.put(
    "/profile/doctor-photo",
    form,
  );
}

export async function deleteDoctorProfilePhoto() {
  await http.delete(
    "/profile/doctor-photo",
  );
}
