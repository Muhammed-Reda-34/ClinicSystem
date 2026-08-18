using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Domain.Entities;

public sealed class SalaryAdjustment
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    public int Year { get; set; }
    public int Month { get; set; }

    public SalaryAdjustmentType Type { get; set; }
    public decimal Amount { get; set; }
    public string? Notes { get; set; }

    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
