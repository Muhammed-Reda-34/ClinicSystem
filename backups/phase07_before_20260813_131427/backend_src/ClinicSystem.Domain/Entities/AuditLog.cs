namespace ClinicSystem.Domain.Entities;

public sealed class AuditLog
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string? OldValuesJson { get; set; }
    public string? NewValuesJson { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
