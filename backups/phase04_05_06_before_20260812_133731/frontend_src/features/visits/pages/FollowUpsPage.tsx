import {
  useMemo,
  useState,
} from "react";
import {
  useQuery,
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
} from "../api/visitsApi";
import styles from "./FollowUpsPage.module.css";

const today =
  new Date()
    .toISOString()
    .slice(0, 10);

function bounds(date: string) {
  const from =
    new Date(`${date}T00:00:00`);
  const to =
    new Date(`${date}T00:00:00`);
  to.setDate(to.getDate() + 1);

  return {
    fromUtc: from.toISOString(),
    toUtc: to.toISOString(),
  };
}

export function FollowUpsPage() {
  const {
    t,
    language,
  } =
    useLanguage();

  const [date, setDate] =
    useState(today);

  const range =
    useMemo(
      () => bounds(date),
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
            {language === "ar"
              ? "المتابعات المسجلة من الزيارات حسب اليوم."
              : "Follow-ups scheduled from patient visits."}
          </p>
        </div>

        <label className={styles.datePicker}>
          <span>
            {t("followUpDate")}
          </span>
          <input
            type="date"
            value={date}
            onChange={event =>
              setDate(
                event.target.value,
              )
            }
          />
        </label>
      </header>

      <div className={styles.list}>
        {query.data?.map(
          item => (
            <article
              key={item.visitId}
              className={styles.card}
            >
              <div className={styles.time}>
                {new Date(
                  item.followUpAtUtc,
                ).toLocaleTimeString(
                  language === "ar"
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
              </div>

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
            </article>
          ),
        )}

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
