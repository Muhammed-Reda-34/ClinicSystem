using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Domain.Entities;

public sealed class ApprovalRequest
{
    public Guid Id { get; set; }
    public string RequestType { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string RequestedAction { get; set; } = string.Empty;
    public string? PayloadJson { get; set; }

    public Guid RequestedByUserId { get; set; }
    public Guid RequiredDoctorId { get; set; }

    public ApprovalRequestStatus Status { get; set; }
        = ApprovalRequestStatus.Pending;

    public DateTime RequestedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAtUtc { get; set; }

    public Guid? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public string? ReviewNote { get; set; }
}
