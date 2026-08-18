using System.Text.Json;
using ClinicSystem.Domain.Entities;
using ClinicSystem.Infrastructure.Persistence;

namespace ClinicSystem.Infrastructure.Audit;

public sealed class AuditService
{
    private readonly ClinicDbContext _db;

    public AuditService(ClinicDbContext db)
    {
        _db = db;
    }

    public void Add(
        Guid userId,
        string action,
        string entityType,
        string entityId,
        object? oldValues,
        object? newValues,
        string? ipAddress)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            OldValuesJson = oldValues is null ? null : JsonSerializer.Serialize(oldValues),
            NewValuesJson = newValues is null ? null : JsonSerializer.Serialize(newValues),
            IpAddress = ipAddress,
            CreatedAtUtc = DateTime.UtcNow
        });
    }
}
