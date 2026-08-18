import { http } from "../../../lib/http";
import type { DashboardData } from "../../../types/operations";

export async function getDashboard() {
  const response =
    await http.get<DashboardData>("/dashboard");
  return response.data;
}
