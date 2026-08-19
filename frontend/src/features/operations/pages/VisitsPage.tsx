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
  useDoctorContext,
} from "../../context/DoctorContext";
import {
  useLanguage,
} from "../../../i18n/LanguageContext";
import {
  useDebouncedValue,
} from "../../patients/hooks/useDebouncedValue";
import {
  getRecentVisits,
} from "../api/operationsApi";
import styles from "./VisitsPage.module.css";
import { SimpleDateInput } from "../../../components/forms/SimpleDateInput";

function localDayRange(
  dateValue: string,
) {
  if (!dateValue) {
    return {
      fromUtc: undefined,
      toUtc: undefined,
    };
  }

  const from =
    new Date(
      `${dateValue}T00:00:00`,
    );

  const to =
    new Date(from);

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

function money(value: number) {
  return new Intl.NumberFormat(
    "ar-EG",
    {
      maximumFractionDigits: 2,
    },
  ).format(value);
}

export function VisitsPage() {
  const { language } =
    useLanguage();

  const ar =
    language === "ar";

  const {
    selectedDoctor,
  } =
    useDoctorContext();

  const [search, setSearch] =
    useState("");

  const [date, setDate] =
    useState("");

  const debouncedSearch =
    useDebouncedValue(
      search,
      250,
    );

  const range =
    useMemo(
      () =>
        localDayRange(date),
      [date],
    );

  const query =
    useQuery({
      queryKey: [
        "operations-visits",
        debouncedSearch,
        date,
        selectedDoctor
          ?.doctorId
        ?? "all",
      ],
      queryFn: () =>
        getRecentVisits({
          search:
            debouncedSearch
            || undefined,
          fromUtc:
            range.fromUtc,
          toUtc:
            range.toUtc,
          take: 150,
        }),
    });

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Clinical Timeline
          </p>

          <h1>
            {ar
              ? "الزيارات والعلاج"
              : "Visits & Treatment"}
          </h1>

          <p>
            {ar
              ? "كل الزيارات المسجلة مع العلاج والأسنان والمدفوع والمتبقي."
              : "Recent visits with treatments, teeth, paid and remaining balances."}
          </p>
        </div>

        <Link
          className={styles.newPatientLink}
          to="/patients"
        >
          {ar
            ? "اختر مريضًا لإضافة زيارة"
            : "Select a patient for a new visit"}
        </Link>
      </header>

      <section className={styles.filters}>
        <label>
          <span>
            {ar ? "بحث" : "Search"}
          </span>

          <input
            value={search}
            onChange={event =>
              setSearch(
                event.target.value,
              )
            }
            placeholder={
              ar
                ? "الاسم / الكود / الهاتف / رقم الاستمارة"
                : "Name / code / phone / form number"
            }
          />
        </label>

        <label>
          <span>
            {ar
              ? "تاريخ الزيارة"
              : "Visit date"}
          </span>

          <SimpleDateInput
            value={date}
            onChange={setDate}
          />
        </label>

        {date && (
          <button
            type="button"
            onClick={() =>
              setDate("")
            }
          >
            {ar
              ? "كل التواريخ"
              : "All dates"}
          </button>
        )}
      </section>

      <section className={styles.card}>
        {query.isLoading ? (
          <div className={styles.state}>
            {ar
              ? "جاري تحميل الزيارات..."
              : "Loading visits..."}
          </div>
        ) : query.isError ? (
          <div className={styles.state}>
            {ar
              ? "تعذر تحميل الزيارات."
              : "Unable to load visits."}
          </div>
        ) : (
          <div className={styles.visitList}>
            {query.data?.map(
              visit => (
                <article
                  key={
                    visit.visitId
                  }
                  className={styles.visitRow}
                >
                  <div className={styles.dateBlock}>
                    <strong>
                      {new Date(
                        visit.visitDateUtc,
                      ).toLocaleDateString(
                        ar
                          ? "ar-EG"
                          : "en-GB",
                        {
                          day:
                            "2-digit",
                          month:
                            "short",
                          year:
                            "numeric",
                        },
                      )}
                    </strong>

                    <small>
                      {new Date(
                        visit.visitDateUtc,
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
                    </small>
                  </div>

                  <div className={styles.mainInfo}>
                    <Link
                      to={`/patients/${visit.patientId}`}
                    >
                      {
                        visit.patientName
                      }
                    </Link>

                    <span>
                      {
                        visit.patientCode
                      }
                      {" • "}
                      {
                        visit.doctorName
                      }
                    </span>

                    <strong>
                      {
                        visit.treatmentSummary
                        || (
                          ar
                            ? "بدون وصف علاج"
                            : "No treatment description"
                        )
                      }
                    </strong>

                    <small>
                      {ar
                        ? "الأسنان:"
                        : "Teeth:"}
                      {" "}
                      {
                        visit.teethSummary
                        || "—"
                      }
                    </small>
                  </div>

                  <div className={styles.money}>
                    <div>
                      <span>
                        {ar
                          ? "الإجمالي"
                          : "Total"}
                      </span>
                      <strong>
                        {money(
                          visit.total,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        {ar
                          ? "المدفوع"
                          : "Paid"}
                      </span>
                      <strong>
                        {money(
                          visit.paid,
                        )}
                      </strong>
                    </div>

                    <div
                      className={
                        visit.remaining > 0
                          ? styles.remaining
                          : ""
                      }
                    >
                      <span>
                        {ar
                          ? "المتبقي"
                          : "Remaining"}
                      </span>
                      <strong>
                        {money(
                          visit.remaining,
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    <Link
                      to={`/patients/${visit.patientId}`}
                    >
                      {ar
                        ? "ملف المريض"
                        : "Patient"}
                    </Link>

                    <Link
                      to={`/patients/${visit.patientId}/visits/new`}
                    >
                      {ar
                        ? "زيارة جديدة"
                        : "New visit"}
                    </Link>
                  </div>
                </article>
              ),
            )}

            {query.data
              ?.length === 0 && (
              <div className={styles.state}>
                {ar
                  ? "لا توجد زيارات مطابقة."
                  : "No matching visits."}
              </div>
            )}
          </div>
        )}
      </section>
    </section>
  );
}
