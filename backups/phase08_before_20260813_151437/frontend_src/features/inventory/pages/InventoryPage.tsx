import { useMemo, useState, type FormEvent } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { useLanguage } from "../../../i18n/LanguageContext";
import {
  createInventoryItem,
  getInventoryItems,
  getInventoryTransactions,
  recordInventoryTransaction,
} from "../api/inventoryApi";
import styles from "./InventoryPage.module.css";

const transactionTypes = [
  { value: 1, ar: "توريد", en: "Stock in" },
  { value: 2, ar: "استهلاك", en: "Consumption" },
  { value: 3, ar: "تسوية زيادة", en: "Adjustment +" },
  { value: 4, ar: "تسوية نقص", en: "Adjustment -" },
];

export function InventoryPage() {
  const { language } = useLanguage();
  const { hasRole } = useAuth();
  const client = useQueryClient();

  const canCreate = hasRole("Owner");
  const canTransact =
    hasRole("Owner")
    || hasRole("Secretary")
    || hasRole("Nurse");

  const itemsQuery = useQuery({
    queryKey: ["inventory-items"],
    queryFn: getInventoryItems,
  });

  const transactionsQuery = useQuery({
    queryKey: ["inventory-transactions"],
    queryFn: getInventoryTransactions,
  });

  const [itemForm, setItemForm] = useState({
    name: "",
    category: "",
    unit: "",
    openingQuantity: 0,
    reorderLevel: 0,
    averageUnitCost: 0,
  });

  const [txForm, setTxForm] = useState({
    itemId: "",
    type: 2,
    quantity: 1,
    unitCost: "",
    notes: "",
  });

  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["inventory-items"] }),
      client.invalidateQueries({ queryKey: ["inventory-transactions"] }),
      client.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: createInventoryItem,
    onSuccess: async () => {
      setItemForm({
        name: "",
        category: "",
        unit: "",
        openingQuantity: 0,
        reorderLevel: 0,
        averageUnitCost: 0,
      });
      await refresh();
    },
  });

  const transactionMutation = useMutation({
    mutationFn: () =>
      recordInventoryTransaction(
        txForm.itemId,
        {
          type: txForm.type,
          quantity: Number(txForm.quantity),
          unitCost:
            txForm.unitCost === ""
              ? null
              : Number(txForm.unitCost),
          notes: txForm.notes || null,
        },
      ),
    onSuccess: async () => {
      setTxForm(current => ({
        ...current,
        quantity: 1,
        unitCost: "",
        notes: "",
      }));
      await refresh();
    },
  });

  const lowStockCount = useMemo(
    () =>
      itemsQuery.data?.filter(x => x.isLowStock).length ?? 0,
    [itemsQuery.data],
  );

  function submitItem(event: FormEvent) {
    event.preventDefault();
    createMutation.mutate(itemForm);
  }

  function submitTransaction(event: FormEvent) {
    event.preventDefault();
    if (!txForm.itemId) return;
    transactionMutation.mutate();
  }

  const ar = language === "ar";

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Inventory</p>
          <h1>{ar ? "الجرد والمخزون" : "Inventory"}</h1>
          <p>
            {ar
              ? "رصيد المستلزمات، تسجيل الاستهلاك، وحد إعادة الطلب."
              : "Clinic supplies, consumption and reorder alerts."}
          </p>
        </div>

        <div className={[
          styles.lowStockCard,
          lowStockCount > 0 ? styles.lowStockActive : "",
        ].join(" ")}>
          <span>{ar ? "تنبيهات النقص" : "Low stock"}</span>
          <strong>{lowStockCount}</strong>
        </div>
      </header>

      <section className={styles.explainer}>
        <article>
          <span className={styles.stepNumber}>01</span>
          <div>
            <strong>{ar ? "إضافة صنف = تعريف الحاجة لأول مرة" : "Add item = define a stock item once"}</strong>
            <p>
              {ar
                ? "مثال: جوانتي لاتكس. تسجل الاسم، الوحدة (علبة)، الرصيد الموجود وقت البداية، حد النقص، ومتوسط تكلفة العلبة. لا تعيد إضافة نفس الصنف كل مرة تشتريه."
                : "Example: latex gloves. Define its name, unit, opening quantity, reorder level and average unit cost once."}
            </p>
          </div>
        </article>

        <article>
          <span className={styles.stepNumber}>02</span>
          <div>
            <strong>{ar ? "تسجيل حركة = تغيير كمية صنف موجود" : "Record transaction = change an existing item's quantity"}</strong>
            <p>
              {ar
                ? "اشتريت 3 علب؟ اختر «توريد +3». استخدمت علبة؟ اختر «استهلاك 1». حصل فرق في الجرد الفعلي؟ استخدم «تسوية زيادة/نقص» مع ملاحظة."
                : "Bought 3 boxes? Stock in +3. Used 1 box? Consumption 1. Use adjustments only for physical count differences."}
            </p>
          </div>
        </article>
      </section>

      <div className={styles.summaryGrid}>
        <article>
          <span>{ar ? "عدد الأصناف" : "Items"}</span>
          <strong>{itemsQuery.data?.length ?? 0}</strong>
        </article>
        <article>
          <span>{ar ? "حركات مسجلة" : "Transactions"}</span>
          <strong>{transactionsQuery.data?.length ?? 0}</strong>
        </article>
      </div>

      {(canCreate || canTransact) && (
        <div className={styles.formsGrid}>
          {canCreate && (
            <form className={styles.card} onSubmit={submitItem}>
              <h2>{ar ? "إضافة صنف جديد للمخزن" : "Add new inventory item"}</h2>
              <p className={styles.formHelp}>
                {ar
                  ? "استخدمها مرة واحدة فقط عند تعريف مستلزم جديد."
                  : "Use this only when defining a new supply item."}
              </p>

              <div className={styles.formGrid}>
                <label>
                  <span>{ar ? "اسم الصنف" : "Item name"}</span>
                  <input
                    required
                    value={itemForm.name}
                    onChange={e =>
                      setItemForm({ ...itemForm, name: e.target.value })
                    }
                  />
                </label>

                <label>
                  <span>{ar ? "الفئة" : "Category"}</span>
                  <input
                    required
                    value={itemForm.category}
                    onChange={e =>
                      setItemForm({ ...itemForm, category: e.target.value })
                    }
                  />
                </label>

                <label>
                  <span>{ar ? "الوحدة" : "Unit"}</span>
                  <input
                    required
                    placeholder={ar ? "قطعة / علبة / كيس..." : "piece / box / bag..."}
                    value={itemForm.unit}
                    onChange={e =>
                      setItemForm({ ...itemForm, unit: e.target.value })
                    }
                  />
                </label>

                <label>
                  <span>{ar ? "الرصيد الافتتاحي" : "Opening stock"}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={itemForm.openingQuantity}
                    onChange={e =>
                      setItemForm({
                        ...itemForm,
                        openingQuantity: Number(e.target.value),
                      })
                    }
                  />
                </label>

                <label>
                  <span>{ar ? "حد إعادة الطلب" : "Reorder level"}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={itemForm.reorderLevel}
                    onChange={e =>
                      setItemForm({
                        ...itemForm,
                        reorderLevel: Number(e.target.value),
                      })
                    }
                  />
                </label>

                <label>
                  <span>{ar ? "متوسط تكلفة الوحدة" : "Average unit cost"}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.averageUnitCost}
                    onChange={e =>
                      setItemForm({
                        ...itemForm,
                        averageUnitCost: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>

              <button disabled={createMutation.isPending}>
                {ar ? "حفظ الصنف" : "Save item"}
              </button>
            </form>
          )}

          {canTransact && (
            <form className={styles.card} onSubmit={submitTransaction}>
              <h2>{ar ? "تسجيل حركة على صنف موجود" : "Record movement on existing item"}</h2>
              <p className={styles.formHelp}>
                {ar
                  ? "أي توريد أو استهلاك أو فرق جرد بعد إنشاء الصنف يسجل هنا."
                  : "All stock-in, consumption and stock-count adjustments are recorded here."}
              </p>

              <div className={styles.formGrid}>
                <label className={styles.full}>
                  <span>{ar ? "الصنف" : "Item"}</span>
                  <select
                    required
                    value={txForm.itemId}
                    onChange={e =>
                      setTxForm({ ...txForm, itemId: e.target.value })
                    }
                  >
                    <option value="">—</option>
                    {itemsQuery.data?.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} — {item.currentQuantity} {item.unit}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>{ar ? "نوع الحركة" : "Type"}</span>
                  <select
                    value={txForm.type}
                    onChange={e =>
                      setTxForm({ ...txForm, type: Number(e.target.value) })
                    }
                  >
                    {transactionTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {ar ? type.ar : type.en}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>{ar ? "الكمية" : "Quantity"}</span>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={txForm.quantity}
                    onChange={e =>
                      setTxForm({ ...txForm, quantity: Number(e.target.value) })
                    }
                  />
                </label>

                <label>
                  <span>{ar ? "تكلفة الوحدة - اختياري" : "Unit cost - optional"}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={txForm.unitCost}
                    onChange={e =>
                      setTxForm({ ...txForm, unitCost: e.target.value })
                    }
                  />
                </label>

                <label className={styles.full}>
                  <span>{ar ? "ملاحظات" : "Notes"}</span>
                  <textarea
                    rows={3}
                    value={txForm.notes}
                    onChange={e =>
                      setTxForm({ ...txForm, notes: e.target.value })
                    }
                  />
                </label>
              </div>

              <button disabled={transactionMutation.isPending || !txForm.itemId}>
                {ar ? "تسجيل الحركة" : "Record"}
              </button>
            </form>
          )}
        </div>
      )}

      <section className={styles.card}>
        <h2>{ar ? "الأصناف" : "Inventory items"}</h2>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>{ar ? "الصنف" : "Item"}</th>
                <th>{ar ? "الفئة" : "Category"}</th>
                <th>{ar ? "الكمية" : "Quantity"}</th>
                <th>{ar ? "حد الطلب" : "Reorder"}</th>
                <th>{ar ? "تكلفة الوحدة" : "Unit cost"}</th>
                <th>{ar ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {itemsQuery.data?.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.category}</td>
                  <td>{item.currentQuantity} {item.unit}</td>
                  <td>{item.reorderLevel}</td>
                  <td>{item.averageUnitCost.toLocaleString()}</td>
                  <td>
                    <span className={
                      item.isLowStock ? styles.lowBadge : styles.okBadge
                    }>
                      {item.isLowStock
                        ? (ar ? "ناقص" : "Low")
                        : (ar ? "متوفر" : "OK")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.card}>
        <h2>{ar ? "آخر حركات المخزون" : "Recent transactions"}</h2>
        <div className={styles.transactionList}>
          {transactionsQuery.data?.map(tx => (
            <div key={tx.id} className={styles.transactionRow}>
              <div>
                <strong>{tx.itemName}</strong>
                <small>
                  {new Date(tx.createdAtUtc).toLocaleString(
                    ar ? "ar-EG" : "en-GB",
                  )}
                </small>
              </div>
              <div>
                <span>{tx.quantityBefore} → {tx.quantityAfter}</span>
                <small>{tx.notes || "—"}</small>
              </div>
              <strong>{tx.estimatedCost.toLocaleString()} EGP</strong>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
