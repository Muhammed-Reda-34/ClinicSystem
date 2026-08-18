let selectedDoctorId:
  | string
  | null =
  localStorage.getItem(
    "clinic.selectedDoctorId",
  );

export function getSelectedDoctorId() {
  return selectedDoctorId;
}

export function setSelectedDoctorId(
  doctorId: string | null,
) {
  selectedDoctorId = doctorId;

  if (doctorId) {
    localStorage.setItem(
      "clinic.selectedDoctorId",
      doctorId,
    );
  } else {
    localStorage.removeItem(
      "clinic.selectedDoctorId",
    );
  }
}
