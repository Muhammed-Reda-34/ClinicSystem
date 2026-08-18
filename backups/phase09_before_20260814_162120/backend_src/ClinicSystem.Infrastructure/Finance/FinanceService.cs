using ClinicSystem.Application.Common.Security;
using ClinicSystem.Domain.Entities;
using ClinicSystem.Domain.Enums;
using ClinicSystem.Infrastructure.Audit;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.Finance;

public sealed class FinanceService
{
    private readonly ClinicDbContext _db;
    private readonly AuditService _audit;
    private readonly AccountingPeriodGuard _periodGuard;

    public FinanceService(
        ClinicDbContext db,
        AuditService audit,
        AccountingPeriodGuard periodGuard)
    {
        _db = db;
        _audit = audit;
        _periodGuard = periodGuard;
    }

    public async Task<IReadOnlyCollection<ClinicExpenseDto>>
        GetClinicExpensesAsync(
            int year,
            int month,
            CancellationToken cancellationToken)
    {
        var (fromUtc, toUtc) =
            MonthRange(year, month);

        return await _db.ClinicExpenses
            .AsNoTracking()
            .Where(
                x =>
                    x.ExpenseDateUtc >= fromUtc
                    && x.ExpenseDateUtc < toUtc)
            .OrderByDescending(
                x => x.ExpenseDateUtc)
            .Select(
                x => new ClinicExpenseDto(
                    x.Id,
                    x.Category,
                    x.Description,
                    x.Amount,
                    x.ExpenseDateUtc,
                    x.Notes,
                    x.CreatedByUserId,
                    x.CreatedAtUtc))
            .ToListAsync(
                cancellationToken);
    }

    public async Task<(bool Ok, string? Error, Guid? Id)>
        CreateClinicExpenseAsync(
            CreateClinicExpenseCommand command,
            Guid actorUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        if (command.Amount <= 0)
        {
            return (
                false,
                "Amount must be greater than zero.",
                null);
        }

        if (
            !await _periodGuard.IsOpenAsync(
                command.ExpenseDateUtc,
                cancellationToken)
        )
        {
            return (
                false,
                "Accounting period is closed.",
                null);
        }

        var expense =
            new ClinicExpense
            {
                Id = Guid.NewGuid(),
                Category =
                    command.Category.Trim(),
                Description =
                    command.Description.Trim(),
                Amount =
                    command.Amount,
                ExpenseDateUtc =
                    command.ExpenseDateUtc,
                Notes =
                    CleanOptional(
                        command.Notes),
                CreatedByUserId =
                    actorUserId,
                CreatedAtUtc =
                    DateTime.UtcNow
            };

        _db.ClinicExpenses.Add(expense);

        _audit.Add(
            actorUserId,
            "ClinicExpenseCreated",
            nameof(ClinicExpense),
            expense.Id.ToString(),
            null,
            new
            {
                expense.Category,
                expense.Description,
                expense.Amount,
                expense.ExpenseDateUtc
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return (true, null, expense.Id);
    }

    public async Task<IReadOnlyCollection<SalaryProfileDto>>
        GetSalaryProfilesAsync(
            CancellationToken cancellationToken)
    {
        var staff =
            await (
                from user in _db.Users.AsNoTracking()
                join userRole in _db.UserRoles.AsNoTracking()
                    on user.Id equals userRole.UserId
                join role in _db.Roles.AsNoTracking()
                    on userRole.RoleId equals role.Id
                where role.Name == UserRoles.Secretary
                    || role.Name == UserRoles.Nurse
                orderby user.FullName
                select new
                {
                    user.Id,
                    user.FullName,
                    Role = role.Name!
                })
            .ToListAsync(
                cancellationToken);

        if (staff.Count == 0)
        {
            return [];
        }

        var ids =
            staff.Select(x => x.Id).ToArray();

        var rates =
            await _db.EmployeeSalaryRates
            .AsNoTracking()
            .Where(x => ids.Contains(x.UserId))
            .OrderByDescending(x => x.EffectiveFrom)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return staff
            .Select(
                person =>
                {
                    var rate =
                        rates.FirstOrDefault(
                            x =>
                                x.UserId
                                == person.Id);

                    return new SalaryProfileDto(
                        person.Id,
                        person.FullName,
                        person.Role,
                        rate?.BaseSalary ?? 0,
                        rate?.EffectiveFrom,
                        rate is not null);
                })
            .ToArray();
    }

    public async Task<(bool Ok, string? Error, Guid? Id)>
        SetSalaryRateAsync(
            Guid userId,
            decimal baseSalary,
            DateOnly effectiveFrom,
            Guid actorUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        if (baseSalary < 0)
        {
            return (
                false,
                "Base salary cannot be negative.",
                null);
        }

        var effectiveDateUtc =
            DateTime.SpecifyKind(
                effectiveFrom.ToDateTime(
                    TimeOnly.MinValue),
                DateTimeKind.Utc);

        if (
            !await _periodGuard.IsOpenAsync(
                effectiveDateUtc,
                cancellationToken)
        )
        {
            return (
                false,
                "The accounting period for this salary rate is closed.",
                null);
        }

        var isStaff =
            await (
                from userRole in _db.UserRoles.AsNoTracking()
                join role in _db.Roles.AsNoTracking()
                    on userRole.RoleId equals role.Id
                where userRole.UserId == userId
                    && (
                        role.Name == UserRoles.Secretary
                        || role.Name == UserRoles.Nurse
                    )
                select userRole.UserId)
            .AnyAsync(cancellationToken);

        if (!isStaff)
        {
            return (
                false,
                "Salary can only be assigned to clinic staff.",
                null);
        }

        var rate =
            new EmployeeSalaryRate
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                BaseSalary = baseSalary,
                EffectiveFrom = effectiveFrom,
                CreatedByUserId =
                    actorUserId,
                CreatedAtUtc =
                    DateTime.UtcNow
            };

        _db.EmployeeSalaryRates.Add(rate);

        _audit.Add(
            actorUserId,
            "SalaryRateCreated",
            nameof(EmployeeSalaryRate),
            rate.Id.ToString(),
            null,
            new
            {
                rate.UserId,
                rate.BaseSalary,
                rate.EffectiveFrom
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return (true, null, rate.Id);
    }

    public async Task<(bool Ok, string? Error, Guid? Id)>
        AddSalaryAdjustmentAsync(
            Guid userId,
            int year,
            int month,
            SalaryAdjustmentType type,
            decimal amount,
            string? notes,
            Guid actorUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        ValidateMonth(year, month);

        if (amount <= 0)
        {
            return (
                false,
                "Adjustment amount must be greater than zero.",
                null);
        }

        var monthDate =
            new DateTime(
                year,
                month,
                1,
                0,
                0,
                0,
                DateTimeKind.Utc);

        if (
            !await _periodGuard.IsOpenAsync(
                monthDate,
                cancellationToken)
        )
        {
            return (
                false,
                "Accounting period is closed.",
                null);
        }

        var adjustment =
            new SalaryAdjustment
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Year = year,
                Month = month,
                Type = type,
                Amount = amount,
                Notes =
                    CleanOptional(notes),
                CreatedByUserId =
                    actorUserId,
                CreatedAtUtc =
                    DateTime.UtcNow
            };

        _db.SalaryAdjustments.Add(
            adjustment);

        _audit.Add(
            actorUserId,
            "SalaryAdjustmentCreated",
            nameof(SalaryAdjustment),
            adjustment.Id.ToString(),
            null,
            new
            {
                adjustment.UserId,
                adjustment.Year,
                adjustment.Month,
                adjustment.Type,
                adjustment.Amount
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return (
            true,
            null,
            adjustment.Id);
    }

    public async Task<IReadOnlyCollection<SalaryAdjustmentDto>>
        GetSalaryAdjustmentsAsync(
            int year,
            int month,
            CancellationToken cancellationToken)
    {
        ValidateMonth(year, month);

        return await (
            from adjustment
                in _db.SalaryAdjustments
                .AsNoTracking()
            join user
                in _db.Users.AsNoTracking()
                on adjustment.UserId
                equals user.Id
            where adjustment.Year == year
                && adjustment.Month == month
            orderby adjustment.CreatedAtUtc descending
            select new SalaryAdjustmentDto(
                adjustment.Id,
                adjustment.UserId,
                user.FullName,
                adjustment.Year,
                adjustment.Month,
                adjustment.Type,
                adjustment.Amount,
                adjustment.Notes,
                adjustment.CreatedAtUtc))
            .ToListAsync(
                cancellationToken);
    }

    public async Task<IReadOnlyCollection<PayrollRowDto>>
        GetPayrollAsync(
            int year,
            int month,
            CancellationToken cancellationToken)
    {
        ValidateMonth(year, month);

        var monthEnd =
            new DateOnly(
                year,
                month,
                DateTime.DaysInMonth(
                    year,
                    month));

        var staff =
            await (
                from user
                    in _db.Users.AsNoTracking()
                join userRole
                    in _db.UserRoles.AsNoTracking()
                    on user.Id
                    equals userRole.UserId
                join role
                    in _db.Roles.AsNoTracking()
                    on userRole.RoleId
                    equals role.Id
                where role.Name
                    == UserRoles.Secretary
                    || role.Name
                    == UserRoles.Nurse
                orderby user.FullName
                select new
                {
                    user.Id,
                    user.FullName,
                    Role = role.Name!
                })
            .ToListAsync(
                cancellationToken);

        if (staff.Count == 0)
        {
            return [];
        }

        var userIds =
            staff
            .Select(x => x.Id)
            .ToArray();

        var rates =
            await _db.EmployeeSalaryRates
            .AsNoTracking()
            .Where(
                x =>
                    userIds.Contains(x.UserId)
                    && x.EffectiveFrom
                    <= monthEnd)
            .OrderByDescending(
                x => x.EffectiveFrom)
            .ThenByDescending(
                x => x.CreatedAtUtc)
            .ToListAsync(
                cancellationToken);

        var adjustments =
            await _db.SalaryAdjustments
            .AsNoTracking()
            .Where(
                x =>
                    userIds.Contains(x.UserId)
                    && x.Year == year
                    && x.Month == month)
            .ToListAsync(
                cancellationToken);

        return staff
            .Select(
                person =>
                {
                    var baseSalary =
                        rates.FirstOrDefault(
                            x =>
                                x.UserId
                                == person.Id)
                        ?.BaseSalary
                        ?? 0;

                    var personAdjustments =
                        adjustments
                        .Where(
                            x =>
                                x.UserId
                                == person.Id)
                        .ToArray();

                    var increases =
                        personAdjustments
                        .Where(
                            x =>
                                x.Type
                                == SalaryAdjustmentType
                                .Increase)
                        .Sum(x => x.Amount);

                    var bonuses =
                        personAdjustments
                        .Where(
                            x =>
                                x.Type
                                == SalaryAdjustmentType
                                .Bonus)
                        .Sum(x => x.Amount);

                    var deductions =
                        personAdjustments
                        .Where(
                            x =>
                                x.Type
                                == SalaryAdjustmentType
                                .Deduction)
                        .Sum(x => x.Amount);

                    var net =
                        baseSalary
                        + increases
                        + bonuses
                        - deductions;

                    return new PayrollRowDto(
                        person.Id,
                        person.FullName,
                        person.Role,
                        baseSalary,
                        increases,
                        bonuses,
                        deductions,
                        Math.Max(0, net));
                })
            .ToArray();
    }

    public async Task<IReadOnlyCollection<AccountingPeriodDto>>
        GetAccountingPeriodsAsync(
            CancellationToken cancellationToken)
    {
        return await _db.AccountingPeriods
            .AsNoTracking()
            .OrderByDescending(x => x.Year)
            .ThenByDescending(x => x.Month)
            .Select(
                x => new AccountingPeriodDto(
                    x.Id,
                    x.Year,
                    x.Month,
                    x.Status,
                    x.ClosedAtUtc,
                    x.ReopenedAtUtc))
            .ToListAsync(
                cancellationToken);
    }

    public async Task<AccountingPeriodDto>
        GetOrCreatePeriodAsync(
            int year,
            int month,
            CancellationToken cancellationToken)
    {
        ValidateMonth(year, month);

        var period =
            await _db.AccountingPeriods
            .SingleOrDefaultAsync(
                x =>
                    x.Year == year
                    && x.Month == month,
                cancellationToken);

        if (period is null)
        {
            period =
                new AccountingPeriod
                {
                    Id = Guid.NewGuid(),
                    Year = year,
                    Month = month,
                    Status =
                        DefaultPeriodStatus(
                            year,
                            month),
                    CreatedAtUtc =
                        DateTime.UtcNow
                };

            _db.AccountingPeriods.Add(period);

            await _db.SaveChangesAsync(
                cancellationToken);
        }

        return MapPeriod(period);
    }

    public async Task<(bool Ok, string? Error)>
        ClosePeriodAsync(
            int year,
            int month,
            Guid actorUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        var period =
            await GetPeriodEntityAsync(
                year,
                month,
                cancellationToken);

        if (
            period.Status
            == AccountingPeriodStatus.Closed
        )
        {
            return (
                true,
                null);
        }

        var oldStatus =
            period.Status;

        period.Status =
            AccountingPeriodStatus.Closed;
        period.ClosedAtUtc =
            DateTime.UtcNow;
        period.ClosedByUserId =
            actorUserId;

        _audit.Add(
            actorUserId,
            "AccountingPeriodClosed",
            nameof(AccountingPeriod),
            period.Id.ToString(),
            new
            {
                Status = oldStatus
            },
            new
            {
                period.Status,
                period.ClosedAtUtc
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return (
            true,
            null);
    }

    public async Task<(bool Ok, string? Error)>
        ReopenPeriodAsync(
            int year,
            int month,
            Guid actorUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        var period =
            await GetPeriodEntityAsync(
                year,
                month,
                cancellationToken);

        var oldStatus =
            period.Status;

        period.Status =
            AccountingPeriodStatus.Open;
        period.ReopenedAtUtc =
            DateTime.UtcNow;
        period.ReopenedByUserId =
            actorUserId;

        _audit.Add(
            actorUserId,
            "AccountingPeriodReopened",
            nameof(AccountingPeriod),
            period.Id.ToString(),
            new
            {
                Status = oldStatus
            },
            new
            {
                period.Status,
                period.ReopenedAtUtc
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return (
            true,
            null);
    }

    public async Task<MonthlyFinancialReportDto>
        GetMonthlyReportAsync(
            int year,
            int month,
            IReadOnlyCollection<Guid> doctorIds,
            bool isClinicWide,
            CancellationToken cancellationToken)
    {
        ValidateMonth(year, month);

        var (fromUtc, toUtc) =
            MonthRange(year, month);

        var visitQuery =
            _db.PatientVisits
            .AsNoTracking()
            .Where(
                visit =>
                    visit.VisitDateUtc >= fromUtc
                    && visit.VisitDateUtc < toUtc);

        var paymentQuery =
            _db.Payments
            .AsNoTracking()
            .Where(
                payment =>
                    payment.PaidAtUtc >= fromUtc
                    && payment.PaidAtUtc < toUtc);

        var labQuery =
            _db.LabExpenses
            .AsNoTracking()
            .Where(
                expense =>
                    expense.ExpenseDateUtc >= fromUtc
                    && expense.ExpenseDateUtc < toUtc);

        if (!isClinicWide)
        {
            visitQuery =
                visitQuery.Where(
                    x =>
                        doctorIds
                        .Contains(x.DoctorId));

            paymentQuery =
                paymentQuery.Where(
                    x =>
                        doctorIds
                        .Contains(x.DoctorId));

            labQuery =
                labQuery.Where(
                    x =>
                        doctorIds
                        .Contains(x.DoctorId));
        }

        var visits =
            await visitQuery
            .Select(
                visit => new
                {
                    visit.Id,
                    visit.DiscountAmount,
                    visit.ExtraAmount,
                    Subtotal =
                        visit.TreatmentItems
                        .Sum(
                            item =>
                                item.UnitPriceSnapshot
                                * item.Quantity),
                    PaidAllTime =
                        visit.Payments
                        .Sum(
                            payment =>
                                payment.Amount)
                })
            .ToListAsync(
                cancellationToken);

        var billedTreatment =
            visits.Sum(
                x =>
                    x.Subtotal
                    - x.DiscountAmount
                    + x.ExtraAmount);

        var outstanding =
            visits.Sum(
                x =>
                    Math.Max(
                        0,
                        (
                            x.Subtotal
                            - x.DiscountAmount
                            + x.ExtraAmount
                        )
                        - x.PaidAllTime));

        var collectedRevenue =
            await paymentQuery
            .SumAsync(
                x => (decimal?)x.Amount,
                cancellationToken)
            ?? 0;

        var labExpenses =
            await labQuery
            .SumAsync(
                x => (decimal?)x.Amount,
                cancellationToken)
            ?? 0;

        decimal manualExpenses = 0;
        decimal inventoryCost = 0;
        decimal payrollCost = 0;

        if (isClinicWide)
        {
            manualExpenses =
                await _db.ClinicExpenses
                .AsNoTracking()
                .Where(
                    x =>
                        x.ExpenseDateUtc >= fromUtc
                        && x.ExpenseDateUtc < toUtc)
                .SumAsync(
                    x => (decimal?)x.Amount,
                    cancellationToken)
                ?? 0;

            inventoryCost =
                await _db.InventoryTransactions
                .AsNoTracking()
                .Where(
                    x =>
                        x.CreatedAtUtc >= fromUtc
                        && x.CreatedAtUtc < toUtc
                        && (
                            x.Type
                            == InventoryTransactionType
                            .Consumption
                            || x.Type
                            == InventoryTransactionType
                            .AdjustmentDecrease
                        ))
                .SumAsync(
                    x =>
                        (decimal?)(
                            x.Quantity
                            * x.UnitCostSnapshot
                        ),
                    cancellationToken)
                ?? 0;

            var payroll =
                await GetPayrollAsync(
                    year,
                    month,
                    cancellationToken);

            payrollCost =
                payroll.Sum(
                    x => x.NetSalary);
        }

        var totalExpenses =
            manualExpenses
            + labExpenses
            + inventoryCost
            + payrollCost;

        return new MonthlyFinancialReportDto(
            year,
            month,
            isClinicWide,
            billedTreatment,
            collectedRevenue,
            outstanding,
            manualExpenses,
            labExpenses,
            inventoryCost,
            payrollCost,
            totalExpenses,
            collectedRevenue
            - totalExpenses);
    }

    public async Task<DashboardDto>
        GetDashboardAsync(
            IReadOnlyCollection<Guid> doctorIds,
            bool canViewFinancials,
            bool isClinicWideFinancials,
            DateTime todayStartUtc,
            DateTime tomorrowStartUtc,
            CancellationToken cancellationToken)
    {
        var patientQuery =
            _db.Patients
            .AsNoTracking()
            .Where(
                patient =>
                    !patient.IsArchived)
            .AsQueryable();

        var appointmentQuery =
            _db.Appointments
            .AsNoTracking()
            .AsQueryable();

        var visitQuery =
            _db.PatientVisits
            .AsNoTracking()
            .AsQueryable();

        if (!isClinicWideFinancials)
        {
            patientQuery =
                patientQuery.Where(
                    patient =>
                        patient.DoctorAssignments
                        .Any(
                            assignment =>
                                doctorIds
                                .Contains(
                                    assignment.DoctorId)));

            appointmentQuery =
                appointmentQuery.Where(
                    x =>
                        doctorIds
                        .Contains(x.DoctorId));

            visitQuery =
                visitQuery.Where(
                    x =>
                        doctorIds
                        .Contains(x.DoctorId));
        }

        var totalPatients =
            await patientQuery
            .CountAsync(
                cancellationToken);

        var todayAppointments =
            await appointmentQuery
            .CountAsync(
                x =>
                    x.ScheduledAtUtc >= todayStartUtc
                    && x.ScheduledAtUtc < tomorrowStartUtc,
                cancellationToken);

        var todayNoShows =
            await appointmentQuery
            .CountAsync(
                x =>
                    x.ScheduledAtUtc >= todayStartUtc
                    && x.ScheduledAtUtc < tomorrowStartUtc
                    && x.AttendanceStatus
                    == AppointmentAttendanceStatus.NoShow,
                cancellationToken);

        var todayFollowUps =
            await visitQuery
            .CountAsync(
                x =>
                    x.FollowUpAtUtc != null
                    && x.FollowUpAtUtc >= todayStartUtc
                    && x.FollowUpAtUtc < tomorrowStartUtc,
                cancellationToken);

        var lowStockItems =
            await _db.InventoryItems
            .AsNoTracking()
            .CountAsync(
                x =>
                    x.IsActive
                    && x.CurrentQuantity
                    <= x.ReorderLevel,
                cancellationToken);

        if (!canViewFinancials)
        {
            return new DashboardDto(
                totalPatients,
                todayAppointments,
                todayNoShows,
                todayFollowUps,
                lowStockItems,
                null,
                null,
                null,
                null);
        }

        var now = DateTime.UtcNow;

        var report =
            await GetMonthlyReportAsync(
                now.Year,
                now.Month,
                doctorIds,
                isClinicWideFinancials,
                cancellationToken);

        var debtVisits =
            await visitQuery
            .Select(
                visit => new
                {
                    Total =
                        visit.TreatmentItems
                        .Sum(
                            item =>
                                item.UnitPriceSnapshot
                                * item.Quantity)
                        - visit.DiscountAmount
                        + visit.ExtraAmount,
                    Paid =
                        visit.Payments
                        .Sum(
                            payment =>
                                payment.Amount)
                })
            .ToListAsync(
                cancellationToken);

        var allOutstanding =
            debtVisits.Sum(
                x =>
                    Math.Max(
                        0,
                        x.Total - x.Paid));

        return new DashboardDto(
            totalPatients,
            todayAppointments,
            todayNoShows,
            todayFollowUps,
            lowStockItems,
            report.CollectedRevenue,
            report.TotalExpenses,
            report.NetCashMovement,
            allOutstanding);
    }

    private async Task<AccountingPeriod>
        GetPeriodEntityAsync(
            int year,
            int month,
            CancellationToken cancellationToken)
    {
        ValidateMonth(year, month);

        var period =
            await _db.AccountingPeriods
            .SingleOrDefaultAsync(
                x =>
                    x.Year == year
                    && x.Month == month,
                cancellationToken);

        if (period is not null)
        {
            return period;
        }

        period =
            new AccountingPeriod
            {
                Id = Guid.NewGuid(),
                Year = year,
                Month = month,
                Status =
                    DefaultPeriodStatus(
                        year,
                        month),
                CreatedAtUtc =
                    DateTime.UtcNow
            };

        _db.AccountingPeriods.Add(period);

        return period;
    }


    private static AccountingPeriodStatus DefaultPeriodStatus(
        int year,
        int month)
    {
        var target =
            new DateTime(
                year,
                month,
                1,
                0,
                0,
                0,
                DateTimeKind.Utc);

        var current =
            new DateTime(
                DateTime.UtcNow.Year,
                DateTime.UtcNow.Month,
                1,
                0,
                0,
                0,
                DateTimeKind.Utc);

        return target < current
            ? AccountingPeriodStatus.Closed
            : AccountingPeriodStatus.Open;
    }

    private static AccountingPeriodDto MapPeriod(
        AccountingPeriod period)
    {
        return new AccountingPeriodDto(
            period.Id,
            period.Year,
            period.Month,
            period.Status,
            period.ClosedAtUtc,
            period.ReopenedAtUtc);
    }

    private static (DateTime FromUtc, DateTime ToUtc)
        MonthRange(
            int year,
            int month)
    {
        ValidateMonth(year, month);

        var fromUtc =
            new DateTime(
                year,
                month,
                1,
                0,
                0,
                0,
                DateTimeKind.Utc);

        return (
            fromUtc,
            fromUtc.AddMonths(1));
    }

    private static void ValidateMonth(
        int year,
        int month)
    {
        if (
            year < 2020
            || year > 2200
            || month < 1
            || month > 12
        )
        {
            throw new ArgumentOutOfRangeException(
                nameof(month),
                "Invalid accounting month.");
        }
    }

    private static string? CleanOptional(
        string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
