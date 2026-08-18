import { http } from "../../../lib/http";
import type {
  AccountingPeriod,
  ClinicExpense,
  MonthlyFinancialReport,
  PayrollRow,
  SalaryProfile,
} from "../../../types/operations";

export async function getMonthlyReport(year: number, month: number) {
  const r = await http.get<MonthlyFinancialReport>(
    "/finance/monthly-report",
    { params: { year, month } },
  );
  return r.data;
}

export async function getExpenses(year: number, month: number) {
  const r = await http.get<ClinicExpense[]>(
    "/finance/expenses",
    { params: { year, month } },
  );
  return r.data;
}

export async function createExpense(payload: unknown) {
  await http.post("/finance/expenses", payload);
}

export async function getSalaryProfiles() {
  const r = await http.get<SalaryProfile[]>(
    "/finance/salary-profiles",
  );
  return r.data;
}

export async function setSalaryRate(
  userId: string,
  payload: { baseSalary: number; effectiveFrom: string },
) {
  await http.post(
    `/finance/salary-profiles/${userId}`,
    payload,
  );
}

export async function addSalaryAdjustment(
  userId: string,
  payload: unknown,
) {
  await http.post(
    `/finance/salary-adjustments/${userId}`,
    payload,
  );
}

export async function getPayroll(year: number, month: number) {
  const r = await http.get<PayrollRow[]>(
    "/finance/payroll",
    { params: { year, month } },
  );
  return r.data;
}

export async function getAccountingPeriods() {
  const r = await http.get<AccountingPeriod[]>(
    "/finance/periods",
  );
  return r.data;
}

export async function closePeriod(year: number, month: number) {
  await http.post(`/finance/periods/${year}/${month}/close`);
}

export async function reopenPeriod(year: number, month: number) {
  await http.post(`/finance/periods/${year}/${month}/reopen`);
}
