import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  useLanguage,
} from "../../../i18n/LanguageContext";
import {
  createDoctor,
  createStaff,
  getDoctors,
  getStaff,
} from "../api/usersApi";
import styles from "./UsersPage.module.css";

export function UsersPage() {
  const { t, language } =
    useLanguage();

  const queryClient =
    useQueryClient();

  const doctorsQuery =
    useQuery({
      queryKey:
        ["admin", "doctors"],
      queryFn: getDoctors,
    });

  const staffQuery =
    useQuery({
      queryKey:
        ["admin", "staff"],
      queryFn: getStaff,
    });

  const [
    doctorForm,
    setDoctorForm,
  ] =
    useState({
      fullName: "",
      email: "",
      password: "",
      specialization: "",
    });

  const [
    staffForm,
    setStaffForm,
  ] =
    useState({
      fullName: "",
      email: "",
      password: "",
      role:
        "Secretary" as
          | "Secretary"
          | "Nurse",
      doctorIds:
        [] as string[],
    });

  const doctorMutation =
    useMutation({
      mutationFn:
        createDoctor,
      onSuccess:
        async () => {
          setDoctorForm({
            fullName: "",
            email: "",
            password: "",
            specialization: "",
          });

          await queryClient
            .invalidateQueries({
              queryKey:
                [
                  "admin",
                  "doctors",
                ],
            });
        },
    });

  const staffMutation =
    useMutation({
      mutationFn:
        createStaff,
      onSuccess:
        async () => {
          setStaffForm({
            fullName: "",
            email: "",
            password: "",
            role:
              "Secretary",
            doctorIds: [],
          });

          await queryClient
            .invalidateQueries({
              queryKey:
                [
                  "admin",
                  "staff",
                ],
            });
        },
    });

  const activeDoctors =
    useMemo(
      () =>
        doctorsQuery.data
        ?.filter(
          doctor =>
            doctor.isActive,
        )
        ?? [],
      [doctorsQuery.data],
    );

  function submitDoctor(
    event: FormEvent,
  ) {
    event.preventDefault();

    doctorMutation.mutate({
      ...doctorForm,
      specialization:
        doctorForm
          .specialization
        || undefined,
    });
  }

  function submitStaff(
    event: FormEvent,
  ) {
    event.preventDefault();

    staffMutation.mutate(
      staffForm,
    );
  }

  function toggleDoctor(
    doctorId: string,
  ) {
    setStaffForm(
      current => ({
        ...current,
        doctorIds:
          current.doctorIds
          .includes(doctorId)
            ? current.doctorIds
              .filter(
                id =>
                  id
                  !== doctorId,
              )
            : [
                ...current
                  .doctorIds,
                doctorId,
              ],
      }),
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>
          Administration
        </p>

        <h1>
          {t(
            "administration",
          )}
        </h1>

        <p>
          {language === "ar"
            ? "إدارة الأطباء والسكرتارية والتمريض وربط الموظفين بالأطباء."
            : "Manage doctors, secretary and nursing staff and their doctor assignments."}
        </p>
      </header>

      <div className={styles.formsGrid}>
        <article className={styles.card}>
          <h2>
            {t("addDoctor")}
          </h2>

          <form
            className={styles.form}
            onSubmit={
              submitDoctor
            }
          >
            <label>
              <span>
                {t("fullName")}
              </span>
              <input
                value={
                  doctorForm
                    .fullName
                }
                required
                onChange={event =>
                  setDoctorForm({
                    ...doctorForm,
                    fullName:
                      event
                        .target
                        .value,
                  })
                }
              />
            </label>

            <label>
              <span>
                {t("email")}
              </span>
              <input
                type="email"
                value={
                  doctorForm
                    .email
                }
                required
                onChange={event =>
                  setDoctorForm({
                    ...doctorForm,
                    email:
                      event
                        .target
                        .value,
                  })
                }
              />
            </label>

            <label>
              <span>
                {t(
                  "specialization",
                )}
              </span>
              <input
                value={
                  doctorForm
                    .specialization
                }
                onChange={event =>
                  setDoctorForm({
                    ...doctorForm,
                    specialization:
                      event
                        .target
                        .value,
                  })
                }
              />
            </label>

            <label>
              <span>
                {t(
                  "temporaryPassword",
                )}
              </span>
              <input
                type="password"
                minLength={8}
                value={
                  doctorForm
                    .password
                }
                required
                onChange={event =>
                  setDoctorForm({
                    ...doctorForm,
                    password:
                      event
                        .target
                        .value,
                  })
                }
              />
            </label>

            <button
              className={
                styles.primary
              }
              disabled={
                doctorMutation
                  .isPending
              }
            >
              {t("addDoctor")}
            </button>
          </form>
        </article>

        <article className={styles.card}>
          <h2>
            {t("addStaff")}
          </h2>

          <form
            className={styles.form}
            onSubmit={
              submitStaff
            }
          >
            <label>
              <span>
                {t("fullName")}
              </span>
              <input
                value={
                  staffForm
                    .fullName
                }
                required
                onChange={event =>
                  setStaffForm({
                    ...staffForm,
                    fullName:
                      event
                        .target
                        .value,
                  })
                }
              />
            </label>

            <label>
              <span>
                {t("email")}
              </span>
              <input
                type="email"
                value={
                  staffForm
                    .email
                }
                required
                onChange={event =>
                  setStaffForm({
                    ...staffForm,
                    email:
                      event
                        .target
                        .value,
                  })
                }
              />
            </label>

            <label>
              <span>
                {t("role")}
              </span>
              <select
                value={
                  staffForm.role
                }
                onChange={event =>
                  setStaffForm({
                    ...staffForm,
                    role:
                      event
                        .target
                        .value as
                        | "Secretary"
                        | "Nurse",
                  })
                }
              >
                <option
                  value="Secretary"
                >
                  {t(
                    "secretary",
                  )}
                </option>

                <option
                  value="Nurse"
                >
                  {t("nurse")}
                </option>
              </select>
            </label>

            <fieldset
              className={
                styles.fieldset
              }
            >
              <legend>
                {t(
                  "worksWith",
                )}
              </legend>

              <div
                className={
                  styles.checkList
                }
              >
                {activeDoctors
                  .map(
                    doctor => (
                      <label
                        key={
                          doctor.doctorId
                        }
                        className={
                          styles.checkRow
                        }
                      >
                        <input
                          type="checkbox"
                          checked={
                            staffForm
                              .doctorIds
                              .includes(
                                doctor.doctorId,
                              )
                          }
                          onChange={() =>
                            toggleDoctor(
                              doctor.doctorId,
                            )
                          }
                        />

                        <span>
                          {
                            doctor.fullName
                          }
                        </span>
                      </label>
                    ),
                  )}
              </div>
            </fieldset>

            <label>
              <span>
                {t(
                  "temporaryPassword",
                )}
              </span>
              <input
                type="password"
                minLength={8}
                value={
                  staffForm
                    .password
                }
                required
                onChange={event =>
                  setStaffForm({
                    ...staffForm,
                    password:
                      event
                        .target
                        .value,
                  })
                }
              />
            </label>

            <button
              className={
                styles.primary
              }
              disabled={
                staffMutation
                  .isPending
                || staffForm
                  .doctorIds
                  .length === 0
              }
            >
              {t("addStaff")}
            </button>
          </form>
        </article>
      </div>

      <div className={styles.listsGrid}>
        <article className={styles.card}>
          <h2>
            {t(
              "doctorsList",
            )}
          </h2>

          <div className={styles.list}>
            {doctorsQuery.data
              ?.map(
                doctor => (
                  <div
                    className={
                      styles.row
                    }
                    key={
                      doctor.doctorId
                    }
                  >
                    <div>
                      <strong>
                        {
                          doctor.fullName
                        }
                      </strong>

                      <small>
                        {
                          doctor.specialization
                          || "—"
                        }
                      </small>
                    </div>

                    <span
                      className={
                        styles.badge
                      }
                    >
                      {doctor.isOwner
                        ? t(
                          "ownerDoctor",
                        )
                        : t(
                          "doctor",
                        )}
                    </span>
                  </div>
                ),
              )}

            {doctorsQuery.data
              ?.length === 0 && (
              <div className={styles.empty}>
                {t("noData")}
              </div>
            )}
          </div>
        </article>

        <article className={styles.card}>
          <h2>
            {t(
              "staffList",
            )}
          </h2>

          <div className={styles.list}>
            {staffQuery.data
              ?.map(
                staff => (
                  <div
                    className={
                      styles.row
                    }
                    key={
                      staff.userId
                    }
                  >
                    <div>
                      <strong>
                        {
                          staff.fullName
                        }
                      </strong>

                      <small>
                        {staff.doctors
                          .map(
                            doctor =>
                              doctor.fullName,
                          )
                          .join(" • ")}
                      </small>
                    </div>

                    <span
                      className={
                        styles.badge
                      }
                    >
                      {staff.role
                        === "Secretary"
                        ? t(
                          "secretary",
                        )
                        : t(
                          "nurse",
                        )}
                    </span>
                  </div>
                ),
              )}
          </div>
        </article>
      </div>
    </section>
  );
}
