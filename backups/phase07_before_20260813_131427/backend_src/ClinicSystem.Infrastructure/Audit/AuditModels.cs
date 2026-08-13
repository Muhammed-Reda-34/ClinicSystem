namespace ClinicSystem.Infrastructure.Audit;

public sealed record AuditLogListItemDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string Action,
    string EntityType,
    string EntityId,
    string? OldValuesJson,
    string? NewValuesJson,
    string? IpAddress,
    DateTime CreatedAtUtc
);

public sealed record PagedAuditLogsDto(
    int Page,
    int PageSize,
    int TotalCount,
    IReadOnlyCollection<AuditLogListItemDto> Items
);
