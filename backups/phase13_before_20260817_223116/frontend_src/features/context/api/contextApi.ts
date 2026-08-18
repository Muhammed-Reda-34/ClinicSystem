import { http } from "../../../lib/http";
import type {
  AccessibleDoctor,
} from "../../../types/context";

export async function
  getAccessibleDoctors() {
  const response =
    await http.get<
      AccessibleDoctor[]
    >("/context/doctors");

  return response.data;
}
