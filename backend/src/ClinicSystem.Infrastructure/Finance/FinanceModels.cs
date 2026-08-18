using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Infrastructure.Finance;

public sealed record ClinicExpenseDto(
    Guid Id,
    string Category,
    string Description,
    decimal Amount,
    DateTime ExpenseDateUtc,
    string? Notes,
    Guid CreatedByUserId,
    DateTime CreatedAtUtc
);

public sealed record CreateClinicExpenseCommand(
    string Category,
    string Description,
    decimal Amount,
    DateTime ExpenseDateUtc,
    string? Notes
);

public sealed record SalaryProfileDto(
    Guid UserId,
    string FullName,
    string Role,
    decimal BaseSalary,
    DateOnly? EffectiveFrom,
    bool IsSalaryProfileActive
);

public sealed record SalaryAdjustmentDto(
    Guid Id,
    Guid UserId,
    string FullName,
    int Year,
    int Month,
    SalaryAdjustmentType Type,
    decimal Amount,
    string? Notes,
    DateTime CreatedAtUtc
);

public sealed record PayrollRowDto(
    Guid UserId,
    string FullName,
    string Role,
    decimal BaseSalary,
    decimal Increases,
    decimal Bonuses,
    decimal Deductions,
    decimal NetSalary
);

public sealed record AccountingPeriodDto(
    Guid Id,
    int Year,
    int Month,
    AccountingPeriodStatus Status,
    DateTime? ClosedAtUtc,
    DateTime? ReopenedAtUtc
);

public sealed record MonthlyFinancialReportDto(
    int Year,
    int Month,
    bool IsClinicWide,
    decimal BilledTreatment,
    decimal CollectedRevenue,
    decimal OutstandingFromMonthVisits,
    decimal ManualExpenses,
    decimal LabExpenses,
    decimal InventoryConsumptionCost,
    decimal PayrollCost,
    decimal TotalExpenses,
    decimal NetCashMovement
);

public sealed record DashboardDto(
    int TotalPatients,
    int TodayAppointments,
    int TodayNoShows,
    int TodayFollowUps,
    int LowStockItems,
    decimal TodayCollectedRevenue,
    decimal? TodayLabExpenses,
    decimal? LabExpensesThisMonth,
    decimal? CollectedRevenueThisMonth,
    decimal? ExpensesThisMonth,
    decimal? NetThisMonth,
    decimal? OutstandingBalances
);
