namespace ClinicSystem.Domain.Entities;

public sealed class ClinicExpense
{
    public Guid Id { get; set; }

    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public decimal Amount { get; set; }
    public DateTime ExpenseDateUtc { get; set; }
    public string? Notes { get; set; }

    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
