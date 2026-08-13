using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.Audit;

public sealed class AuditLogQueryService
{
    private readonly ClinicDbContext _db;

    public AuditLogQueryService(
        ClinicDbContext db)
    {
        _db = db;
    }

    public async Task<PagedAuditLogsDto> SearchAsync(
        string? search,
        DateTime? fromUtc,
        DateTime? toUtc,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 20, 100);

        var query =
            from log
                in _db.AuditLogs
                .AsNoTracking()
            join user
                in _db.Users
                .AsNoTracking()
                on log.UserId equals user.Id
            select new
            {
                Log = log,
                UserName = user.FullName
            };

        if (fromUtc is not null)
        {
            query = query.Where(
                x =>
                    x.Log.CreatedAtUtc
                    >= fromUtc.Value);
        }

        if (toUtc is not null)
        {
            query = query.Where(
                x =>
                    x.Log.CreatedAtUtc
                    < toUtc.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();

            query = query.Where(
                x =>
                    EF.Functions.ILike(
                        x.UserName,
                        $"%{term}%")
                    || EF.Functions.ILike(
                        x.Log.Action,
                        $"%{term}%")
                    || EF.Functions.ILike(
                        x.Log.EntityType,
                        $"%{term}%")
                    || EF.Functions.ILike(
                        x.Log.EntityId,
                        $"%{term}%"));
        }

        var total =
            await query.CountAsync(
                cancellationToken);

        var rows =
            await query
            .OrderByDescending(
                x => x.Log.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(
                x => new AuditLogListItemDto(
                    x.Log.Id,
                    x.Log.UserId,
                    x.UserName,
                    x.Log.Action,
                    x.Log.EntityType,
                    x.Log.EntityId,
                    x.Log.OldValuesJson,
                    x.Log.NewValuesJson,
                    x.Log.IpAddress,
                    x.Log.CreatedAtUtc))
            .ToListAsync(
                cancellationToken);

        return new PagedAuditLogsDto(
            page,
            pageSize,
            total,
            rows);
    }
}
