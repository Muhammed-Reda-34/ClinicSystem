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
  removePatientFromBlacklist,
} from "../../operations/api/operationsApi";
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

  const {
    hasRole,
  } =
    useAuth();

  const queryClient =
    useQueryClient();

  const canRemove =
    hasRole("Owner")
    || hasRole("Secretary");

  const [search, setSearch] =
    useState("");

  const debouncedSearch =
    useDebouncedValue(
      search,
      250,
    );

  const removeMutation =
    useMutation({
      mutationFn:
        removePatientFromBlacklist,
      onSuccess:
        async () => {
          await Promise.all([
            queryClient
              .invalidateQueries({
                queryKey:
                  ["patients"],
              }),
            queryClient
              .invalidateQueries({
                queryKey:
                  ["appointments"],
              }),
            queryClient
              .invalidateQueries({
                queryKey:
                  ["dashboard"],
              }),
          ]);
        },
    });

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

              <div className={styles.sideActions}>
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

                {canRemove && (
                  <button
                    type="button"
                    disabled={
                      removeMutation
                        .isPending
                    }
                    onClick={() =>
                      removeMutation
                        .mutate(
                          patient.id,
                        )
                    }
                  >
                    {language === "ar"
                      ? "إزالة من القائمة"
                      : "Remove"}
                  </button>
                )}
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
