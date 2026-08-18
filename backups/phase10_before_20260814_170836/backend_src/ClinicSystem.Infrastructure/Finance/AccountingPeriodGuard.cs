using ClinicSystem.Domain.Enums;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.Finance;

public sealed class AccountingPeriodGuard
{
    private readonly ClinicDbContext _db;

    public AccountingPeriodGuard(
        ClinicDbContext db)
    {
        _db = db;
    }

    public async Task<bool> IsOpenAsync(
        DateTime dateUtc,
        CancellationToken cancellationToken)
    {
        var year = dateUtc.Year;
        var month = dateUtc.Month;

        var period =
            await _db.AccountingPeriods
            .AsNoTracking()
            .Where(
                x =>
                    x.Year == year
                    && x.Month == month)
            .Select(
                x => new
                {
                    x.Status
                })
            .SingleOrDefaultAsync(
                cancellationToken);

        if (period is not null)
        {
            return period.Status
                != AccountingPeriodStatus.Closed;
        }

        var currentMonthStart =
            new DateTime(
                DateTime.UtcNow.Year,
                DateTime.UtcNow.Month,
                1,
                0,
                0,
                0,
                DateTimeKind.Utc);

        var targetMonthStart =
            new DateTime(
                year,
                month,
                1,
                0,
                0,
                0,
                DateTimeKind.Utc);

        // Previous months are implicitly closed.
        // Owner can explicitly reopen one, which creates
        // an AccountingPeriod row with Open status.
        return targetMonthStart
            >= currentMonthStart;
    }
}
