import {
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
  useDoctorContext,
} from "../../context/DoctorContext";
import {
  getPatients,
} from "../api/patientsApi";
import {
  useDebouncedValue,
} from "../hooks/useDebouncedValue";
import {
  toWhatsAppHref,
} from "../utils/whatsapp";
import styles from "./BlacklistPage.module.css";

export function BlacklistPage() {
  const {
    t,
    language,
  } =
    useLanguage();

  const {
    selectedDoctor,
  } =
    useDoctorContext();

  const [search, setSearch] =
    useState("");

  const debouncedSearch =
    useDebouncedValue(
      search,
      250,
    );

  const query =
    useQuery({
      queryKey: [
        "patients",
        "blacklist",
        debouncedSearch,
        selectedDoctor
          ?.doctorId
        ?? "all",
      ],
      queryFn: () =>
        getPatients({
          search:
            debouncedSearch
            || undefined,
          page: 1,
          pageSize: 100,
          blacklisted: true,
        }),
    });

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Non-compliance
          </p>

          <h1>
            {t("blacklist")}
          </h1>

          <p>
            {t(
              "blacklistAutoNote",
            )}
          </p>
        </div>

        <div className={styles.count}>
          {query.data
            ?.totalCount
          ?? 0}
        </div>
      </header>

      <input
        className={styles.search}
        value={search}
        onChange={event =>
          setSearch(
            event.target.value,
          )
        }
        placeholder={t(
          "searchPlaceholder",
        )}
      />

      <div className={styles.list}>
        {query.data?.items.map(
          patient => (
            <article
              key={patient.id}
              className={styles.card}
            >
              <div>
                <Link
                  className={
                    styles.name
                  }
                  to={`/patients/${patient.id}`}
                >
                  {patient.fullName}
                </Link>

                <div
                  className={
                    styles.meta
                  }
                >
                  <span>
                    {
                      patient.patientCode
                    }
                  </span>
                  <span>•</span>
                  <a
                    href={toWhatsAppHref(
                      patient.phoneNumber,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {
                      patient.phoneNumber
                    }
                  </a>
                </div>
              </div>

              <div className={styles.noShow}>
                <strong>
                  {patient.noShowCount}
                </strong>
                <span>
                  {language === "ar"
                    ? "مرات لم يحضر"
                    : "no-shows"}
                </span>
              </div>
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
            ?.items.length
            === 0 && (
            <div className={styles.state}>
              {t("noData")}
            </div>
          )}
      </div>
    </section>
  );
}
