using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Finance;

public sealed class CreateClinicExpenseRequest
{
    [Required, MaxLength(150)]
    public string Category { get; set; } = string.Empty;

    [Required, MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    public DateTime ExpenseDateUtc { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }
}
