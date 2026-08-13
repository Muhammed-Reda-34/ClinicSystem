using System.ComponentModel.DataAnnotations;
using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Api.Contracts.Finance;

public sealed class AddSalaryAdjustmentRequest
{
    public int Year { get; set; }
    public int Month { get; set; }

    public SalaryAdjustmentType Type { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [MaxLength(1500)]
    public string? Notes { get; set; }
}
