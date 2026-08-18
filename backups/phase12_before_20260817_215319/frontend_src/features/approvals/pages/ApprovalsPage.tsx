import {
  useState,
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
  approveRequest,
  getPendingApprovals,
  rejectRequest,
} from "../api/approvalsApi";
import styles from "./ApprovalsPage.module.css";

function requestLabel(
  type: string,
  ar: boolean,
) {
  if (type === "PatientArchive") {
    return ar
      ? "طلب حذف مريض"
      : "Patient deletion request";
  }

  if (type === "AttachmentDelete") {
    return ar
      ? "طلب حذف ملف"
      : "Attachment deletion request";
  }

  return type;
}

export function ApprovalsPage() {
  const {
    language,
  } =
    useLanguage();

  const ar =
    language === "ar";

  const client =
    useQueryClient();

  const [
    notes,
    setNotes,
  ] =
    useState<
      Record<string, string>
    >({});

  const query =
    useQuery({
      queryKey:
        ["approvals", "pending"],
      queryFn:
        getPendingApprovals,
      refetchInterval:
        30_000,
    });

  const refresh =
    async () => {
      await Promise.all([
        client.invalidateQueries({
          queryKey:
            ["approvals"],
        }),
        client.invalidateQueries({
          queryKey:
            ["approval-count"],
        }),
        client.invalidateQueries({
          queryKey:
            ["patients"],
        }),
        client.invalidateQueries({
          queryKey:
            ["patient-attachments"],
        }),
        client.invalidateQueries({
          queryKey:
            ["dashboard"],
        }),
      ]);
    };

  const approveMutation =
    useMutation({
      mutationFn:
        ({
          id,
          note,
        }: {
          id: string;
          note?: string;
        }) =>
          approveRequest(
            id,
            note,
          ),
      onSuccess:
        refresh,
    });

  const rejectMutation =
    useMutation({
      mutationFn:
        ({
          id,
          note,
        }: {
          id: string;
          note?: string;
        }) =>
          rejectRequest(
            id,
            note,
          ),
      onSuccess:
        refresh,
    });

  return (
    <section className={styles.page}>
      <header>
        <p className={styles.eyebrow}>
          Approval Queue
        </p>

        <h1>
          {ar
            ? "طلبات الموافقة"
            : "Approval Requests"}
        </h1>

        <p>
          {ar
            ? "أي حذف يبدأه حساب سكرتيرة أو ممرضة يظل معلقًا 48 ساعة حتى يوافق الطبيب أو يرفضه."
            : "Destructive requests created by staff remain pending for 48 hours until a doctor approves or rejects them."}
        </p>
      </header>

      <div className={styles.list}>
        {query.data?.map(
          request => {
            const payload =
              request.payloadJson
                ? (() => {
                    try {
                      return JSON.parse(
                        request.payloadJson,
                      ) as Record<
                        string,
                        unknown
                      >;
                    } catch {
                      return null;
                    }
                  })()
                : null;

            const hoursLeft =
              Math.max(
                0,
                (
                  new Date(
                    request.expiresAtUtc,
                  ).getTime()
                  - Date.now()
                )
                / 1000
                / 60
                / 60,
              );

            return (
              <article
                key={request.id}
                className={styles.card}
              >
                <div className={styles.cardHeader}>
                  <div>
                    <span className={styles.type}>
                      {requestLabel(
                        request.requestType,
                        ar,
                      )}
                    </span>

                    <h2>
                      {String(
                        payload?.FullName
                        ?? payload?.fullName
                        ?? payload?.OriginalFileName
                        ?? payload?.originalFileName
                        ?? request.entityId,
                      )}
                    </h2>

                    <small>
                      {ar
                        ? "طلب بواسطة"
                        : "Requested by"}
                      {": "}
                      {request.requestedByName}
                      {" • "}
                      {ar
                        ? "موافقة"
                        : "Approval"}
                      {": "}
                      {request.requiredDoctorName}
                    </small>
                  </div>

                  <div className={styles.expiry}>
                    <strong>
                      {hoursLeft.toFixed(
                        hoursLeft < 10
                          ? 1
                          : 0,
                      )}
                    </strong>
                    <span>
                      {ar
                        ? "ساعة متبقية"
                        : "hours left"}
                    </span>
                  </div>
                </div>

                <div className={styles.meta}>
                  <span>
                    {new Date(
                      request.requestedAtUtc,
                    ).toLocaleString(
                      ar
                        ? "ar-EG"
                        : "en-GB",
                    )}
                  </span>

                  {payload && (
                    <code>
                      {JSON.stringify(
                        payload,
                      )}
                    </code>
                  )}
                </div>

                <label className={styles.note}>
                  <span>
                    {ar
                      ? "ملاحظة الطبيب - اختياري"
                      : "Doctor note - optional"}
                  </span>

                  <input
                    value={
                      notes[
                        request.id
                      ]
                      ?? ""
                    }
                    onChange={event =>
                      setNotes(
                        current => ({
                          ...current,
                          [request.id]:
                            event.target
                            .value,
                        }),
                      )
                    }
                  />
                </label>

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.approve}
                    disabled={
                      approveMutation
                        .isPending
                      || rejectMutation
                        .isPending
                    }
                    onClick={() =>
                      approveMutation
                        .mutate({
                          id: request.id,
                          note:
                            notes[
                              request.id
                            ],
                        })
                    }
                  >
                    {ar
                      ? "موافقة وتنفيذ"
                      : "Approve & execute"}
                  </button>

                  <button
                    type="button"
                    className={styles.reject}
                    disabled={
                      approveMutation
                        .isPending
                      || rejectMutation
                        .isPending
                    }
                    onClick={() =>
                      rejectMutation
                        .mutate({
                          id: request.id,
                          note:
                            notes[
                              request.id
                            ],
                        })
                    }
                  >
                    {ar
                      ? "رفض"
                      : "Reject"}
                  </button>
                </div>
              </article>
            );
          },
        )}

        {query.isLoading && (
          <div className={styles.state}>
            {ar
              ? "جاري تحميل الطلبات..."
              : "Loading approval requests..."}
          </div>
        )}

        {!query.isLoading
          && query.data?.length === 0
          && (
            <div className={styles.state}>
              {ar
                ? "لا توجد طلبات موافقة معلقة."
                : "No pending approval requests."}
            </div>
          )}
      </div>
    </section>
  );
}
