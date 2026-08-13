import {
  useEffect,
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
  useAuth,
} from "../../auth/AuthContext";
import type {
  DentalService,
  DentalServicePayload,
} from "../../../types/clinical";
import {
  createDentalService,
  getDentalServices,
  updateDentalService,
} from "../api/servicesApi";
import styles from "./ServicesPage.module.css";

const emptyForm: DentalServicePayload = {
  category: "",
  nameAr: "",
  nameEn: "",
  currentPrice: 0,
  pricingNoteAr: "",
  isActive: true,
};

export function ServicesPage() {
  const {
    t,
    language,
  } =
    useLanguage();

  const {
    hasRole,
  } =
    useAuth();

  const canManage =
    hasRole("Owner")
    || hasRole("Doctor");

  const queryClient =
    useQueryClient();

  const query =
    useQuery({
      queryKey: [
        "dental-services",
        canManage
          ? "all"
          : "active",
      ],
      queryFn: () =>
        getDentalServices(
          canManage,
        ),
    });

  const [search, setSearch] =
    useState("");

  const [editing, setEditing] =
    useState<DentalService | null>(
      null,
    );

  const [form, setForm] =
    useState<DentalServicePayload>(
      emptyForm,
    );

  useEffect(() => {
    if (!editing) {
      setForm(emptyForm);
      return;
    }

    setForm({
      category:
        editing.category,
      nameAr:
        editing.nameAr,
      nameEn:
        editing.nameEn
        ?? "",
      currentPrice:
        editing.currentPrice,
      pricingNoteAr:
        editing.pricingNoteAr
        ?? "",
      isActive:
        editing.isActive,
    });
  }, [editing]);

  const saveMutation =
    useMutation({
      mutationFn:
        async (
          payload:
            DentalServicePayload,
        ) => {
          if (editing) {
            await updateDentalService(
              editing.id,
              payload,
            );
            return;
          }

          await createDentalService(
            payload,
          );
        },
      onSuccess:
        async () => {
          setEditing(null);
          setForm(emptyForm);

          await queryClient
            .invalidateQueries({
              queryKey:
                [
                  "dental-services",
                ],
            });
        },
    });

  const filtered =
    useMemo(
      () => {
        const term =
          search
            .trim()
            .toLocaleLowerCase();

        if (!term) {
          return query.data
          ?? [];
        }

        return (
          query.data
          ?? []
        ).filter(
          service =>
            service.nameAr
              .toLocaleLowerCase()
              .includes(term)
            || service.nameEn
              ?.toLocaleLowerCase()
              .includes(term)
            || service.category
              .toLocaleLowerCase()
              .includes(term)
            || service.code
              .toLocaleLowerCase()
              .includes(term),
        );
      },
      [
        query.data,
        search,
      ],
    );

  function setField<
    K extends keyof DentalServicePayload,
  >(
    key: K,
    value:
      DentalServicePayload[K],
  ) {
    setForm(
      current => ({
        ...current,
        [key]: value,
      }),
    );
  }

  function submit(
    event: FormEvent,
  ) {
    event.preventDefault();
    saveMutation.mutate(form);
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Price Catalog
          </p>

          <h1>
            {t(
              "serviceCatalog",
            )}
          </h1>

          <p>
            {language === "ar"
              ? "تعديل السعر هنا لا يغيّر أسعار الزيارات القديمة؛ كل زيارة تحتفظ بسعرها وقت التنفيذ."
              : "Changing a price here never changes historical visit prices."}
          </p>
        </div>
      </header>

      <div
        className={
          canManage
            ? styles.layout
            : styles.singleLayout
        }
      >
        {canManage && (
          <section className={styles.editor}>
            <h2>
              {editing
                ? t("edit")
                : t(
                  "addService",
                )}
            </h2>

            <form
              className={styles.form}
              onSubmit={submit}
            >
              <label>
                <span>
                  {t("category")}
                </span>
                <input
                  required
                  value={
                    form.category
                  }
                  onChange={event =>
                    setField(
                      "category",
                      event.target
                        .value,
                    )
                  }
                />
              </label>

              <label>
                <span>
                  {t(
                    "serviceNameAr",
                  )}
                </span>
                <input
                  required
                  value={
                    form.nameAr
                  }
                  onChange={event =>
                    setField(
                      "nameAr",
                      event.target
                        .value,
                    )
                  }
                />
              </label>

              <label>
                <span>
                  {t(
                    "serviceNameEn",
                  )}
                </span>
                <input
                  value={
                    form.nameEn
                    ?? ""
                  }
                  onChange={event =>
                    setField(
                      "nameEn",
                      event.target
                        .value,
                    )
                  }
                />
              </label>

              <label>
                <span>
                  {t("price")}
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={
                    form.currentPrice
                  }
                  onChange={event =>
                    setField(
                      "currentPrice",
                      Number(
                        event.target
                          .value,
                      ),
                    )
                  }
                />
              </label>

              <label>
                <span>
                  {t(
                    "pricingNote",
                  )}
                </span>
                <input
                  value={
                    form.pricingNoteAr
                    ?? ""
                  }
                  onChange={event =>
                    setField(
                      "pricingNoteAr",
                      event.target
                        .value,
                    )
                  }
                />
              </label>

              {editing && (
                <label
                  className={
                    styles.activeToggle
                  }
                >
                  <input
                    type="checkbox"
                    checked={
                      form.isActive
                      ?? true
                    }
                    onChange={event =>
                      setField(
                        "isActive",
                        event.target
                          .checked,
                      )
                    }
                  />
                  <span>
                    {form.isActive
                      ? t("active")
                      : t(
                        "inactive",
                      )}
                  </span>
                </label>
              )}

              <div className={styles.formActions}>
                {editing && (
                  <button
                    type="button"
                    className={
                      styles.secondary
                    }
                    onClick={() =>
                      setEditing(
                        null,
                      )
                    }
                  >
                    {t("cancel")}
                  </button>
                )}

                <button
                  type="submit"
                  className={
                    styles.primary
                  }
                  disabled={
                    saveMutation
                      .isPending
                  }
                >
                  {saveMutation
                    .isPending
                    ? t("saving")
                    : t("save")}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className={styles.catalog}>
          <div className={styles.toolbar}>
            <input
              value={search}
              onChange={event =>
                setSearch(
                  event.target
                    .value,
                )
              }
              placeholder={
                language === "ar"
                  ? "ابحث في الخدمات..."
                  : "Search services..."
              }
            />

            <span>
              {filtered.length}
            </span>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>
                    {t("category")}
                  </th>
                  <th>
                    {t(
                      "treatment",
                    )}
                  </th>
                  <th>
                    {t("price")}
                  </th>
                  <th>
                    {t(
                      "pricingNote",
                    )}
                  </th>
                  <th>
                    {t("status")}
                  </th>
                  {canManage && (
                    <th>
                      {t("actions")}
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filtered.map(
                  service => (
                    <tr
                      key={
                        service.id
                      }
                      className={
                        !service.isActive
                          ? styles.inactiveRow
                          : ""
                      }
                    >
                      <td>
                        {
                          service.category
                        }
                      </td>
                      <td>
                        <strong>
                          {
                            language
                              === "ar"
                              ? service.nameAr
                              : (
                                service.nameEn
                                || service.nameAr
                              )
                          }
                        </strong>
                        <small>
                          {
                            service.code
                          }
                        </small>
                      </td>
                      <td
                        className={
                          styles.price
                        }
                      >
                        {
                          service.currentPrice
                            .toLocaleString(
                              language
                                === "ar"
                                ? "ar-EG"
                                : "en-US",
                            )
                        }
                      </td>
                      <td>
                        {
                          service.pricingNoteAr
                          || "—"
                        }
                      </td>
                      <td>
                        <span
                          className={
                            service.isActive
                              ? styles.active
                              : styles.inactive
                          }
                        >
                          {service.isActive
                            ? t(
                              "active",
                            )
                            : t(
                              "inactive",
                            )}
                        </span>
                      </td>
                      {canManage && (
                        <td>
                          <button
                            type="button"
                            className={
                              styles.editButton
                            }
                            onClick={() =>
                              setEditing(
                                service,
                              )
                            }
                          >
                            {t("edit")}
                          </button>
                        </td>
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>

            {query.isLoading && (
              <div className={styles.state}>
                {t("loading")}
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
