import {
  useMemo,
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
  toWhatsAppHref,
} from "../../patients/utils/whatsapp";
import {
  getFollowUpVisits,
  markFollowUpCompleted,
} from "../api/visitsApi";
import styles from "./FollowUpsPage.module.css";

const today =
  new Date()
    .toISOString()
    .slice(0, 10);

function bounds(
  date: string,
) {
  const from =
    new Date(
      `${date}T00:00:00`,
    );

  const to =
    new Date(
      `${date}T00:00:00`,
    );

  to.setDate(
    to.getDate() + 1,
  );

  return {
    fromUtc:
      from.toISOString(),
    toUtc:
      to.toISOString(),
  };
}

export function FollowUpsPage() {
  const {
    t,
    language,
  } =
    useLanguage();

  const ar =
    language === "ar";

  const client =
    useQueryClient();

  const [
    date,
    setDate,
  ] =
    useState(today);

  const range =
    useMemo(
      () =>
        bounds(date),
      [date],
    );

  const query =
    useQuery({
      queryKey: [
        "follow-ups",
        date,
      ],
      queryFn: () =>
        getFollowUpVisits(
          range.fromUtc,
          range.toUtc,
        ),
    });

  const completeMutation =
    useMutation({
      mutationFn:
        markFollowUpCompleted,
      onSuccess:
        async () => {
          await Promise.all([
            client
              .invalidateQueries({
                queryKey:
                  ["follow-ups"],
              }),
            client
              .invalidateQueries({
                queryKey:
                  [
                    "sidebar-follow-ups",
                  ],
              }),
            client
              .invalidateQueries({
                queryKey:
                  ["dashboard"],
              }),
          ]);
        },
    });

  const pendingCount =
    query.data
      ?.filter(
        item =>
          !item
          .followUpCompletedAtUtc,
      )
      .length
    ?? 0;

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Follow-up
          </p>

          <h1>
            {t("followUps")}
          </h1>

          <p>
            {ar
              ? "رقم الهاتف ظاهر بجانب كل مريض. عند تسجيل «تمت المتابعة» يظل الاسم في الصفحة بلون رمادي ولا يدخل في عداد المتابعات المعلقة."
              : "Phone numbers are visible. Completed follow-ups remain listed in grey and no longer count as pending."}
          </p>
        </div>

        <div className={styles.headerTools}>
          <div className={styles.pendingCard}>
            <span>
              {ar
                ? "مطلوب متابعتهم"
                : "Pending"}
            </span>

            <strong>
              {pendingCount}
            </strong>
          </div>

          <label className={styles.datePicker}>
            <span>
              {t(
                "followUpDate",
              )}
            </span>

            <input
              type="date"
              value={date}
              onChange={event =>
                setDate(
                  event.target
                    .value,
                )
              }
            />
          </label>
        </div>
      </header>

      <div className={styles.list}>
        {query.data?.map(
          item => {
            const completed =
              Boolean(
                item
                .followUpCompletedAtUtc,
              );

            return (
              <article
                key={
                  item.visitId
                }
                className={[
                  styles.card,
                  completed
                    ? styles.completed
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className={styles.time}>
                  {new Date(
                    item.followUpAtUtc,
                  ).toLocaleTimeString(
                    ar
                      ? "ar-EG"
                      : "en-GB",
                    {
                      hour:
                        "2-digit",
                      minute:
                        "2-digit",
                    },
                  )}
                </div>

                <div className={styles.body}>
                  <Link
                    to={`/patients/${item.patientId}`}
                  >
                    {item.patientName}
                  </Link>

                  <small>
                    {item.patientCode}
                    {" • "}
                    {item.doctorName}
                  </small>

                  <a
                    className={styles.phone}
                    href={`tel:${item.phoneNumber}`}
                  >
                    {item.phoneNumber}
                  </a>
                </div>

                <div className={styles.actions}>
                  <a
                    className={styles.whatsapp}
                    href={toWhatsAppHref(
                      item.phoneNumber,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("whatsapp")}
                  </a>

                  {!completed ? (
                    <button
                      type="button"
                      className={styles.completeButton}
                      disabled={
                        completeMutation
                          .isPending
                      }
                      onClick={() =>
                        completeMutation
                          .mutate(
                            item.visitId,
                          )
                      }
                    >
                      {ar
                        ? "تمت المتابعة"
                        : "Completed"}
                    </button>
                  ) : (
                    <span className={styles.completedBadge}>
                      {ar
                        ? "تمت المتابعة"
                        : "Completed"}
                    </span>
                  )}
                </div>
              </article>
            );
          },
        )}

        {query.isLoading && (
          <div className={styles.state}>
            {t("loading")}
          </div>
        )}

        {!query.isLoading
          && query.data
            ?.length === 0
          && (
            <div className={styles.state}>
              {t("noData")}
            </div>
          )}
      </div>
    </section>
  );
}
