import { http } from "../../../lib/http";
import type {
  InventoryItem,
  InventoryTransaction,
} from "../../../types/operations";

export async function getInventoryItems() {
  const r = await http.get<InventoryItem[]>("/inventory");
  return r.data;
}

export async function getInventoryTransactions() {
  const r = await http.get<InventoryTransaction[]>(
    "/inventory/transactions",
    { params: { take: 150 } },
  );
  return r.data;
}

export async function createInventoryItem(payload: {
  name: string;
  category: string;
  unit: string;
  openingQuantity: number;
  reorderLevel: number;
  averageUnitCost: number;
}) {
  await http.post("/inventory", payload);
}

export async function recordInventoryTransaction(
  itemId: string,
  payload: {
    type: number;
    quantity: number;
    unitCost?: number | null;
    notes?: string | null;
  },
) {
  await http.post(
    `/inventory/${itemId}/transactions`,
    payload,
  );
}
