import { http } from "../../../lib/http";
import type { PagedAuditLogs } from "../../../types/operations";

export async function getAuditLogs(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const r = await http.get<PagedAuditLogs>(
    "/audit",
    { params },
  );
  return r.data;
}
