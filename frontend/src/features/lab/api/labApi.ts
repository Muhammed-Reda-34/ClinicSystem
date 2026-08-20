import { http } from "../../../lib/http";
import type {
  LabExpense,
  LabOrder,
  LabPatientLookup,
} from "../../../types/operations";

export async function lookupLabPatient(search: string) {
  const r = await http.get<LabPatientLookup[]>(
    "/lab/patient-lookup",
    { params: { search } },
  );
  return r.data;
}

export async function getLabOrders() {
  const r = await http.get<LabOrder[]>("/lab/orders");
  return r.data;
}

export async function createLabOrder(payload: unknown) {
  await http.post("/lab/orders", payload);
}

export async function getLabExpenses() {
  const r = await http.get<LabExpense[]>("/lab/expenses");
  return r.data;
}

export async function createLabExpense(payload: unknown) {
  await http.post("/lab/expenses", payload);
}

export async function createQuickLabExpense(payload: {
  patientId: string;
  description: string | null;
  amount: number;
  isPaid: boolean;
}) {
  await http.post("/lab/quick-expenses", payload);
}

export async function setLabExpensePaymentStatus(
  expenseId: string,
  isPaid: boolean,
) {
  await http.patch(`/lab/expenses/${expenseId}/payment-status`, { isPaid });
}

export async function updateLabExpense(
  expenseId: string,
  payload: {
    description: string | null;
    amount: number;
    isPaid: boolean;
  },
) {
  await http.put(`/lab/expenses/${expenseId}`, payload);
}

export async function deleteLabExpense(expenseId: string) {
  await http.delete(`/lab/expenses/${expenseId}`);
}