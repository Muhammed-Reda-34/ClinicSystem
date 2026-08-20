using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Lab;

public sealed class UpdateLabExpenseRequest
{
    [MaxLength(300)]
    public string? Description { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    public bool IsPaid { get; set; }
}
