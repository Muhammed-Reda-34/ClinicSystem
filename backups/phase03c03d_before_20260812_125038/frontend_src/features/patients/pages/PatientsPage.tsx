import {
  useEffect,
  useState,
} from "react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Link,
} from "react-router-dom";
import {
  AppIcon,
} from "../../../components/icons/AppIcon";
import {
  useLanguage,
} from "../../../i18n/LanguageContext";
import {
  useDoctorContext,
} from "../../context/DoctorContext";
import {
  useAuth,
} from "../../auth/AuthContext";
import {
  getPatients,
} from "../api/patientsApi";
import {
  useDebouncedValue,
} from "../hooks/useDebouncedValue";
import {
  statusTranslationKey,
} from "../utils/patientStatus";
import {
  toWhatsAppHref,
} from "../utils/whatsapp";
import styles from "./PatientsPage.module.css";

export function PatientsPage() {
  const { t, language } =
    useLanguage();

  const { selectedDoctor } =
    useDoctorContext();

  const { hasRole } =
    useAuth();

  const canEdit =
    hasRole("Owner")
    || hasRole("Doctor")
    || hasRole("Secretary");

  const queryClient =
    useQueryClient();

  const [search, setSearch] =
    useState("");

  const [page, setPage] =
    useState(1);

  const debouncedSearch =
    useDebouncedValue(
      search,
      280,
    );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const handler = () => {
      setPage(1);

      void queryClient
        .invalidateQueries({
          queryKey:
            ["patients"],
        });
    };

    window.addEventListener(
      "clinic:doctor-scope-changed",
      handler,
    );

    return () =>
      window.removeEventListener(
        "clinic:doctor-scope-changed",
        handler,
      );
  }, [queryClient]);

  const query =
    useQuery({
      queryKey: [
        "patients",
        debouncedSearch,
        page,
        selectedDoctor
          ?.doctorId
        ?? "all",
      ],
      queryFn: () =>
        getPatients({
          search:
            debouncedSearch
            || undefined,
          page,
          pageSize: 20,
        }),
    });

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        (
          query.data
            ?.totalCount
          ?? 0
        ) / 20,
      ),
    );

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>
            Patient CRM
          </p>

          <h1>
            {t("patientsTitle")}
          </h1>

          <p className={styles.subtitle}>
            {t(
              "patientsSubtitle",
            )}
          </p>
        </div>

        <Link
          to="/patients/new"
          className={styles.addButton}
        >
          <AppIcon
            name="plus"
            size={18}
          />
          {t("addPatient")}
        </Link>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.searchBox}>
          <AppIcon
            name="search"
            size={19}
          />

          <input
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
        </label>

        <div className={styles.resultCount}>
          {query.data
            ?.totalCount
          ?? 0}
          {" "}
          {t("patients")}
        </div>
      </div>

      <div className={styles.tableCard}>
        {query.isLoading ? (
          <div className={styles.state}>
            {t("loading")}
          </div>
        ) : query.isError ? (
          <div className={styles.state}>
            <p>
              {language === "ar"
                ? "تعذر تحميل المرضى."
                : "Unable to load patients."}
            </p>

            <button
              type="button"
              onClick={() =>
                void query.refetch()
              }
            >
              {t("retry")}
            </button>
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>
                    {t("patient")}
                  </th>
                  <th>
                    {t(
                      "patientCode",
                    )}
                  </th>
                  <th>
                    {t("phone")}
                  </th>
                  <th>
                    {t("age")}
                  </th>
                  <th>
                    {t("doctors")}
                  </th>
                  <th>
                    {t("status")}
                  </th>
                  <th>
                    {t("actions")}
                  </th>
                </tr>
              </thead>

              <tbody>
                {query.data
                  ?.items
                  .map(
                    patient => (
                      <tr
                        key={
                          patient.id
                        }
                      >
                        <td>
                          <div
                            className={
                              styles.patientCell
                            }
                          >
                            <div
                              className={
                                styles.patientAvatar
                              }
                            >
                              {patient
                                .fullName
                                .trim()
                                .charAt(
                                  0,
                                )}
                            </div>

                            <div>
                              <Link
                                className={
                                  styles.patientName
                                }
                                to={`/patients/${patient.id}`}
                              >
                                {
                                  patient.fullName
                                }
                              </Link>

                              {patient.isBlacklisted && (
                                <span
                                  className={
                                    styles.blacklistTag
                                  }
                                >
                                  {
                                    t(
                                      "blacklisted",
                                    )
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div
                            className={
                              styles.codeStack
                            }
                          >
                            <strong>
                              {
                                patient.patientCode
                              }
                            </strong>
                            <small>
                              {
                                patient.formNumber
                                || "—"
                              }
                            </small>
                          </div>
                        </td>

                        <td>
                          <a
                            className={
                              styles.phoneLink
                            }
                            href={toWhatsAppHref(
                              patient.phoneNumber,
                            )}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {
                              patient.phoneNumber
                            }
                            <AppIcon
                              name="external"
                              size={14}
                            />
                          </a>
                        </td>

                        <td>
                          {patient.age
                            ?? "—"}
                        </td>

                        <td>
                          <div
                            className={
                              styles.doctorTags
                            }
                          >
                            {patient.doctors
                              .map(
                                doctor => (
                                  <span
                                    key={
                                      doctor.doctorId
                                    }
                                  >
                                    {
                                      doctor.fullName
                                    }
                                  </span>
                                ),
                              )}
                          </div>
                        </td>

                        <td>
                          <span
                            className={
                              styles.statusTag
                            }
                          >
                            {t(
                              statusTranslationKey(
                                patient.profileStatus,
                              ),
                            )}
                          </span>
                        </td>

                        <td>
                          <div
                            className={
                              styles.actions
                            }
                          >
                            <Link
                              to={`/patients/${patient.id}`}
                              title={t(
                                "open",
                              )}
                            >
                              {t(
                                "open",
                              )}
                            </Link>

                            {canEdit && (
                              <Link
                                to={`/patients/${patient.id}/edit`}
                                title={t(
                                  "edit",
                                )}
                              >
                                <AppIcon
                                  name="edit"
                                  size={16}
                                />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
              </tbody>
            </table>

            {query.data
              ?.items
              .length
              === 0 && (
              <div
                className={
                  styles.empty
                }
              >
                {t(
                  "noPatients",
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <footer className={styles.pagination}>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() =>
            setPage(
              current =>
                Math.max(
                  1,
                  current - 1,
                ),
            )
          }
        >
          {t("previous")}
        </button>

        <span>
          {t("page")} {page}
          {" "}
          {t("of")}
          {" "}
          {totalPages}
        </span>

        <button
          type="button"
          disabled={
            page >= totalPages
          }
          onClick={() =>
            setPage(
              current =>
                current + 1,
            )
          }
        >
          {t("next")}
        </button>
      </footer>
    </section>
  );
}
