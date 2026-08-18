import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "../../../i18n/LanguageContext";
import { getAuditLogs } from "../api/auditApi";
import styles from "./AuditPage.module.css";

export function AuditPage() {
  const { language } = useLanguage();
  const ar = language === "ar";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["audit", search, page],
    queryFn: () =>
      getAuditLogs({
        search: search || undefined,
        page,
        pageSize: 50,
      }),
  });

  const totalPages = Math.max(
    1,
    Math.ceil((query.data?.totalCount ?? 0) / 50),
  );

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Audit Log</p>
          <h1>{ar ? "سجل العمليات والتعديلات" : "Audit Log"}</h1>
          <p>
            {ar
              ? "سجل للعمليات الحساسة والقيم القديمة والجديدة. للعرض فقط."
              : "Read-only history of sensitive operations and changes."}
          </p>
        </div>
      </header>

      <label className={styles.search}>
        <span>{ar ? "بحث" : "Search"}</span>
        <input
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={
            ar
              ? "المستخدم أو العملية أو نوع السجل..."
              : "User, action, entity..."
          }
        />
      </label>

      <section className={styles.card}>
        <div className={styles.list}>
          {query.data?.items.map(log => (
            <article key={log.id} className={styles.row}>
              <div className={styles.primary}>
                <strong>{log.action}</strong>
                <span>{log.entityType} • {log.entityId}</span>
              </div>

              <div className={styles.user}>
                <strong>{log.userName}</strong>
                <small>{log.ipAddress || "—"}</small>
              </div>

              <time>
                {new Date(log.createdAtUtc).toLocaleString(
                  ar ? "ar-EG" : "en-GB",
                )}
              </time>

              {(log.oldValuesJson || log.newValuesJson) && (
                <details className={styles.details}>
                  <summary>{ar ? "التغيير" : "Change"}</summary>
                  <div>
                    <section>
                      <span>{ar ? "قبل" : "Before"}</span>
                      <pre>{log.oldValuesJson || "—"}</pre>
                    </section>
                    <section>
                      <span>{ar ? "بعد" : "After"}</span>
                      <pre>{log.newValuesJson || "—"}</pre>
                    </section>
                  </div>
                </details>
              )}
            </article>
          ))}

          {query.data?.items.length === 0 && (
            <div className={styles.empty}>
              {ar ? "لا توجد عمليات مطابقة." : "No matching audit entries."}
            </div>
          )}
        </div>
      </section>

      <footer className={styles.pagination}>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage(x => Math.max(1, x - 1))}
        >
          {ar ? "السابق" : "Previous"}
        </button>
        <span>{page} / {totalPages}</span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage(x => x + 1)}
        >
          {ar ? "التالي" : "Next"}
        </button>
      </footer>
    </section>
  );
}
