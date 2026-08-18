using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Infrastructure.Approvals;

public sealed record ApprovalRequestListItemDto(
    Guid Id,
    string RequestType,
    string EntityType,
    string EntityId,
    string RequestedAction,
    ApprovalRequestStatus Status,
    Guid RequestedByUserId,
    string RequestedByName,
    Guid RequiredDoctorId,
    string RequiredDoctorName,
    DateTime RequestedAtUtc,
    DateTime ExpiresAtUtc,
    string? PayloadJson
);

public sealed record ApprovalRequestWriteResult(
    bool Succeeded,
    string? ErrorCode,
    string? ErrorMessage,
    Guid? RequestId
);
