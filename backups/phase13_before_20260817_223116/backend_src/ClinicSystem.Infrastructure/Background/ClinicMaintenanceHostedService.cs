using ClinicSystem.Domain.Entities;
using ClinicSystem.Domain.Enums;
using ClinicSystem.Infrastructure.Approvals;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ClinicSystem.Infrastructure.Background;

public sealed class ClinicMaintenanceHostedService
    : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ClinicMaintenanceHostedService> _logger;

    public ClinicMaintenanceHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<ClinicMaintenanceHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        await RunMaintenanceAsync(
            stoppingToken);

        using var timer =
            new PeriodicTimer(
                TimeSpan.FromHours(1));

        while (
            await timer.WaitForNextTickAsync(
                stoppingToken)
        )
        {
            await RunMaintenanceAsync(
                stoppingToken);
        }
    }

    private async Task RunMaintenanceAsync(
        CancellationToken cancellationToken)
    {
        try
        {
            await using var scope =
                _scopeFactory.CreateAsyncScope();

            var db =
                scope.ServiceProvider
                .GetRequiredService<
                    ClinicDbContext>();

            var approvals =
                scope.ServiceProvider
                .GetRequiredService<
                    ApprovalService>();

            await approvals.ExpirePendingAsync(
                cancellationToken);

            var now =
                DateTime.UtcNow;

            var currentMonthStart =
                new DateTime(
                    now.Year,
                    now.Month,
                    1,
                    0,
                    0,
                    0,
                    DateTimeKind.Utc);

            // Ensure the current month exists.
            var currentPeriod =
                await db.AccountingPeriods
                .SingleOrDefaultAsync(
                    x =>
                        x.Year == now.Year
                        && x.Month == now.Month,
                    cancellationToken);

            if (currentPeriod is null)
            {
                db.AccountingPeriods.Add(
                    new AccountingPeriod
                    {
                        Id = Guid.NewGuid(),
                        Year = now.Year,
                        Month = now.Month,
                        Status =
                            AccountingPeriodStatus.Open,
                        CreatedAtUtc = now
                    });
            }

            // Auto-close only normally-open past periods.
            // A past period explicitly reopened by the Owner
            // remains open until the Owner closes it again.
            var pastOpenPeriods =
                await db.AccountingPeriods
                .Where(
                    x =>
                        x.Status
                        == AccountingPeriodStatus.Open
                        && x.ReopenedAtUtc == null
                        && (
                            x.Year < now.Year
                            || (
                                x.Year == now.Year
                                && x.Month < now.Month
                            )
                        ))
                .ToListAsync(
                    cancellationToken);

            foreach (var period in pastOpenPeriods)
            {
                period.Status =
                    AccountingPeriodStatus.Closed;
                period.ClosedAtUtc = now;
                period.ClosedByUserId = null;
            }

            if (
                currentPeriod is null
                || pastOpenPeriods.Count > 0
            )
            {
                await db.SaveChangesAsync(
                    cancellationToken);
            }
        }
        catch (OperationCanceledException)
            when (cancellationToken.IsCancellationRequested)
        {
            // Normal shutdown.
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Clinic background maintenance failed.");
        }
    }
}
