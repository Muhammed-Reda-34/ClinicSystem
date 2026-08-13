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
  useAuth,
} from "../../auth/AuthContext";
import {
  useLanguage,
} from "../../../i18n/LanguageContext";
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
    language,
  } =
    useLanguage();

  const {
    hasRole,
  } =
    useAuth();

  const ar =
    language === "ar";

  const canManage =
    hasRole("Owner")
    || hasRole("Doctor");

  const client =
    useQueryClient();

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    editing,
    setEditing,
  ] =
    useState<
      DentalService | null
    >(null);

  const [
    form,
    setForm,
  ] =
    useState<
      DentalServicePayload
    >(emptyForm);

  const [
    categoryMode,
    setCategoryMode,
  ] =
    useState<
      "existing" | "new"
    >("existing");

  const [
    openCategories,
    setOpenCategories,
  ] =
    useState<
      Set<string>
    >(
      new Set(),
    );

  const query =
    useQuery({
      queryKey: [
        "dental-services",
        canManage,
      ],
      queryFn: () =>
        getDentalServices(
          canManage,
        ),
    });

  const categories =
    useMemo<string[]>(
      () =>
        Array.from(
          new Set<string>(
            (
              query.data
              ?? []
            )
            .map(
              service =>
                service.category
                .trim(),
            )
            .filter(Boolean),
          ),
        )
        .sort(
          (a, b) =>
            a.localeCompare(
              b,
              ar
                ? "ar"
                : "en",
            ),
        ),
      [
        query.data,
        ar,
      ],
    );

  useEffect(() => {
    if (
      openCategories.size === 0
      && categories.length > 0
    ) {
      setOpenCategories(
        new Set<string>([
          categories[0],
        ]),
      );
    }
  }, [
    categories,
    openCategories.size,
  ]);

  useEffect(() => {
    if (!editing) {
      setForm(
        current => ({
          ...emptyForm,
          category:
            current.category
            || categories[0]
            || "",
        }),
      );
      setCategoryMode(
        "existing",
      );
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

    setCategoryMode(
      categories.includes(
        editing.category,
      )
        ? "existing"
        : "new",
    );
  }, [
    editing,
    categories,
  ]);

  const groups =
    useMemo(
      () => {
        const term =
          search
          .trim()
          .toLocaleLowerCase();

        const filtered =
          (
            query.data
            ?? []
          )
          .filter(
            service =>
              !term
              || service.nameAr
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

        const map =
          new Map<
            string,
            DentalService[]
          >();

        for (
          const service
          of filtered
        ) {
          const key =
            service.category
            || (
              ar
                ? "بدون تصنيف"
                : "Uncategorized"
            );

          const rows =
            map.get(key)
            ?? [];

          rows.push(
            service,
          );

          map.set(
            key,
            rows,
          );
        }

        return Array.from(
          map.entries(),
        )
        .sort(
          ([a], [b]) =>
            a.localeCompare(
              b,
              ar
                ? "ar"
                : "en",
            ),
        );
      },
      [
        query.data,
        search,
        ar,
      ],
    );

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
          setEditing(
            null,
          );

          setForm(
            emptyForm,
          );

          await client
            .invalidateQueries({
              queryKey:
                [
                  "dental-services",
                ],
            });
        },
    });

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

    if (
      !form.category.trim()
      || !form.nameAr.trim()
    ) {
      return;
    }

    saveMutation.mutate({
      ...form,
      category:
        form.category.trim(),
      nameAr:
        form.nameAr.trim(),
      nameEn:
        form.nameEn
        ?.trim()
        || null,
      pricingNoteAr:
        form.pricingNoteAr
        ?.trim()
        || null,
    });
  }

  function toggleCategory(
    category: string,
  ) {
    setOpenCategories(
      current => {
        const next =
          new Set(current);

        if (
          next.has(
            category,
          )
        ) {
          next.delete(
            category,
          );
        } else {
          next.add(
            category,
          );
        }

        return next;
      },
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            Price Catalog
          </p>

          <h1>
            {ar
              ? "الخدمات والأسعار"
              : "Services & Pricing"}
          </h1>

          <p>
            {ar
              ? "الخدمات مجمعة حسب التصنيف. تعديل السعر يؤثر على الزيارات الجديدة فقط ويحافظ على سعر كل زيارة قديمة."
              : "Services are grouped by category. Price changes affect new visits only and preserve historical visit prices."}
          </p>
        </div>

        <div className={styles.totalCard}>
          <span>
            {ar
              ? "إجمالي الخدمات"
              : "Total services"}
          </span>

          <strong>
            {query.data?.length
              ?? 0}
          </strong>
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
            <div className={styles.editorHeader}>
              <div>
                <span>
                  {editing
                    ? (
                      ar
                        ? "تعديل خدمة"
                        : "Edit service"
                    )
                    : (
                      ar
                        ? "إضافة خدمة"
                        : "Add service"
                    )}
                </span>

                <strong>
                  {editing
                    ? editing.nameAr
                    : (
                      ar
                        ? "خدمة جديدة"
                        : "New service"
                    )}
                </strong>
              </div>

              {editing && (
                <button
                  type="button"
                  onClick={() =>
                    setEditing(
                      null,
                    )
                  }
                >
                  {ar
                    ? "إلغاء"
                    : "Cancel"}
                </button>
              )}
            </div>

            <form
              className={styles.form}
              onSubmit={submit}
            >
              <label>
                <span>
                  {ar
                    ? "التصنيف"
                    : "Category"}
                </span>

                <select
                  value={
                    categoryMode
                    === "new"
                      ? "__new__"
                      : form.category
                  }
                  onChange={event => {
                    if (
                      event.target
                        .value
                      === "__new__"
                    ) {
                      setCategoryMode(
                        "new",
                      );
                      setField(
                        "category",
                        "",
                      );
                      return;
                    }

                    setCategoryMode(
                      "existing",
                    );
                    setField(
                      "category",
                      event.target
                        .value,
                    );
                  }}
                >
                  <option value="">
                    {ar
                      ? "اختر تصنيفًا"
                      : "Choose category"}
                  </option>

                  {categories.map(
                    category => (
                      <option
                        key={
                          category
                        }
                        value={
                          category
                        }
                      >
                        {category}
                      </option>
                    ),
                  )}

                  <option value="__new__">
                    {ar
                      ? "+ إضافة تصنيف جديد"
                      : "+ Add new category"}
                  </option>
                </select>
              </label>

              {categoryMode
                === "new"
                && (
                  <label>
                    <span>
                      {ar
                        ? "اسم التصنيف الجديد"
                        : "New category name"}
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
                      placeholder={
                        ar
                          ? "مثال: حشو / خلع / تركيبات"
                          : "e.g. Fillings / Extraction / Prosthodontics"
                      }
                    />
                  </label>
                )}

              <label>
                <span>
                  {ar
                    ? "اسم الخدمة بالعربي"
                    : "Arabic name"}
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
                  {ar
                    ? "اسم الخدمة بالإنجليزي"
                    : "English name"}
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
                  {ar
                    ? "السعر الحالي"
                    : "Current price"}
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
                  {ar
                    ? "ملاحظة السعر"
                    : "Pricing note"}
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
                <label className={styles.activeToggle}>
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
                      ? (
                        ar
                          ? "الخدمة نشطة"
                          : "Active"
                      )
                      : (
                        ar
                          ? "الخدمة متوقفة"
                          : "Inactive"
                      )}
                  </span>
                </label>
              )}

              <button
                type="submit"
                className={styles.primary}
                disabled={
                  saveMutation
                    .isPending
                  || !form.category
                    .trim()
                }
              >
                {saveMutation
                  .isPending
                  ? (
                    ar
                      ? "جاري الحفظ..."
                      : "Saving..."
                  )
                  : (
                    ar
                      ? "حفظ الخدمة"
                      : "Save service"
                  )}
              </button>
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
                ar
                  ? "ابحث باسم الخدمة أو التصنيف..."
                  : "Search service or category..."
              }
            />
          </div>

          <div className={styles.categoryList}>
            {groups.map(
              ([
                category,
                services,
              ]) => {
                const open =
                  search.trim()
                  ? true
                  : openCategories
                    .has(category);

                return (
                  <article
                    key={category}
                    className={styles.categoryCard}
                  >
                    <button
                      type="button"
                      className={styles.categoryHeader}
                      onClick={() =>
                        toggleCategory(
                          category,
                        )
                      }
                    >
                      <div>
                        <strong>
                          {category}
                        </strong>

                        <span>
                          {services.length}
                          {" "}
                          {ar
                            ? "خدمة"
                            : "services"}
                        </span>
                      </div>

                      <span className={styles.chevron}>
                        {open
                          ? "−"
                          : "+"}
                      </span>
                    </button>

                    {open && (
                      <div className={styles.serviceRows}>
                        {services.map(
                          service => (
                            <div
                              key={
                                service.id
                              }
                              className={[
                                styles.serviceRow,
                                !service.isActive
                                  ? styles.inactiveRow
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              <div className={styles.serviceName}>
                                <strong>
                                  {ar
                                    ? service.nameAr
                                    : (
                                      service.nameEn
                                      || service.nameAr
                                    )}
                                </strong>

                                <small>
                                  {service.code}
                                  {service.pricingNoteAr
                                    ? ` • ${service.pricingNoteAr}`
                                    : ""}
                                </small>
                              </div>

                              <div className={styles.price}>
                                {service.currentPrice
                                  .toLocaleString(
                                    ar
                                      ? "ar-EG"
                                      : "en-US",
                                  )}
                                <small>
                                  EGP
                                </small>
                              </div>

                              <span
                                className={
                                  service.isActive
                                    ? styles.active
                                    : styles.inactive
                                }
                              >
                                {service.isActive
                                  ? (
                                    ar
                                      ? "نشط"
                                      : "Active"
                                  )
                                  : (
                                    ar
                                      ? "متوقف"
                                      : "Inactive"
                                  )}
                              </span>

                              {canManage && (
                                <button
                                  type="button"
                                  className={styles.editButton}
                                  onClick={() =>
                                    setEditing(
                                      service,
                                    )
                                  }
                                >
                                  {ar
                                    ? "تعديل"
                                    : "Edit"}
                                </button>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </article>
                );
              },
            )}

            {query.isLoading && (
              <div className={styles.state}>
                {ar
                  ? "جاري تحميل الخدمات..."
                  : "Loading services..."}
              </div>
            )}

            {!query.isLoading
              && groups.length === 0
              && (
                <div className={styles.state}>
                  {ar
                    ? "لا توجد خدمات مطابقة."
                    : "No matching services."}
                </div>
              )}
          </div>
        </section>
      </div>
    </section>
  );
}
