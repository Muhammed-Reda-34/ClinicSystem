import {
  useState,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Link,
} from "react-router-dom";
import {
  useLanguage,
} from "../../../i18n/LanguageContext";
import {
  useAuth,
} from "../../auth/AuthContext";
import {
  toWhatsAppHref,
} from "../../patients/utils/whatsapp";
import {
  addVisitPayment,
  getDebtVisits,
} from "../api/visitsApi";
import styles from "./DebtsPage.module.css";

export function DebtsPage() {
  const {
    t,
    language,
  } =
    useLanguage();

  const {
    hasRole,
  } =
    useAuth();

  const canAddPayment =
    hasRole("Owner")
    || hasRole("Secretary");

  const queryClient =
    useQueryClient();

  const [amounts, setAmounts] =
    useState<
      Record<string, string>
    >({});

  const query =
    useQuery({
      queryKey: [
        "visit-debts",
      ],
      queryFn:
        getDebtVisits,
    });

  const paymentMutation =
    useMutation({
      mutationFn:
        ({
          visitId,
          amount,
        }: {
          visitId: string;
          amount: number;
        }) =>
          addVisitPayment(
            visitId,
            amount,
            "Cash",
          ),
      onSuccess:
        async (
          _data,
          variables,
        ) => {
          setAmounts(
            current => ({
              ...current,
              [variables.visitId]:
                "",
            }),
          );

          await Promise.all([
            queryClient
              .invalidateQueries({
                queryKey:
                  [
                    "visit-debts",
                  ],
              }),
            queryClient
              .invalidateQueries({
                queryKey:
                  [
                    "patient-visits",
                  ],
              }),
          ]);
        },
    });

  const totalRemaining =
    (query.data ?? [])
      .reduce(
        (sum, row) =>
          sum + row.remaining,
        0,
      );

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Receivables
          </p>

          <h1>
            {t("debts")}
          </h1>

          <p>
            {language === "ar"
              ? "المريض يختفي تلقائيًا من القائمة بعد سداد المتبقي بالكامل."
              : "A visit disappears automatically when its remaining balance reaches zero."}
          </p>
        </div>

        <div className={styles.totalBox}>
          <span>
            {t(
              "remaining",
            )}
          </span>
          <strong>
            {totalRemaining
              .toLocaleString()}
          </strong>
        </div>
      </header>

      <div className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  {t(
                    "patient",
                  )}
                </th>
                <th>
                  {t(
                    "doctorContext",
                  )}
                </th>
                <th>
                  {t(
                    "createdAt",
                  )}
                </th>
                <th>
                  {t(
                    "total",
                  )}
                </th>
                <th>
                  {t(
                    "paid",
                  )}
                </th>
                <th>
                  {t(
                    "remaining",
                  )}
                </th>
                {canAddPayment && (
                  <th>
                    {t(
                      "addPayment",
                    )}
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {query.data
                ?.map(
                  row => (
                    <tr
                      key={
                        row.visitId
                      }
                    >
                      <td>
                        <Link
                          className={
                            styles.patient
                          }
                          to={`/patients/${row.patientId}`}
                        >
                          {
                            row.patientName
                          }
                        </Link>

                        <div
                          className={
                            styles.meta
                          }
                        >
                          <span>
                            {
                              row.patientCode
                            }
                          </span>
                          <a
                            href={toWhatsAppHref(
                              row.phoneNumber,
                            )}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {
                              row.phoneNumber
                            }
                          </a>
                        </div>
                      </td>

                      <td>
                        {
                          row.doctorName
                        }
                      </td>

                      <td>
                        {new Date(
                          row.visitDateUtc,
                        ).toLocaleDateString(
                          language
                            === "ar"
                            ? "ar-EG"
                            : "en-GB",
                        )}
                      </td>

                      <td>
                        {row.total
                          .toLocaleString()}
                      </td>

                      <td>
                        {row.paid
                          .toLocaleString()}
                      </td>

                      <td
                        className={
                          styles.remaining
                        }
                      >
                        {row.remaining
                          .toLocaleString()}
                      </td>

                      {canAddPayment && (
                        <td>
                          <div
                            className={
                              styles.payment
                            }
                          >
                            <input
                              type="number"
                              min={0.01}
                              max={
                                row.remaining
                              }
                              step="0.01"
                              value={
                                amounts[
                                  row.visitId
                                ]
                                ?? ""
                              }
                              onChange={event =>
                                setAmounts(
                                  current => ({
                                    ...current,
                                    [row.visitId]:
                                      event
                                        .target
                                        .value,
                                  }),
                                )
                              }
                            />

                            <button
                              type="button"
                              disabled={
                                paymentMutation
                                  .isPending
                                || !Number(
                                  amounts[
                                    row.visitId
                                  ],
                                )
                              }
                              onClick={() =>
                                paymentMutation
                                  .mutate({
                                    visitId:
                                      row.visitId,
                                    amount:
                                      Number(
                                        amounts[
                                          row.visitId
                                        ],
                                      ),
                                  })
                              }
                            >
                              {t(
                                "add",
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ),
                )}
            </tbody>
          </table>
        </div>

        {query.isLoading && (
          <div className={styles.state}>
            {t("loading")}
          </div>
        )}

        {!query.isLoading
          && query.data
            ?.length === 0 && (
            <div className={styles.state}>
              {t("noData")}
            </div>
          )}
      </div>
    </section>
  );
}
