import { http } from "../../../lib/http";
import type { ClinicSetting } from "../../../types/operations";

export async function getClinicSettings() {
  const r = await http.get<ClinicSetting>("/settings");
  return r.data;
}

export async function updateClinicSettings(payload: Omit<ClinicSetting, "id" | "updatedAtUtc">) {
  const r = await http.put<ClinicSetting>("/settings", payload);
  return r.data;
}
