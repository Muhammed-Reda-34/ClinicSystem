using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Domain.Entities;

public sealed class AccountingPeriod
{
    public Guid Id { get; set; }

    public int Year { get; set; }
    public int Month { get; set; }

    public AccountingPeriodStatus Status { get; set; }
        = AccountingPeriodStatus.Open;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime? ClosedAtUtc { get; set; }
    public Guid? ClosedByUserId { get; set; }

    public DateTime? ReopenedAtUtc { get; set; }
    public Guid? ReopenedByUserId { get; set; }
}
