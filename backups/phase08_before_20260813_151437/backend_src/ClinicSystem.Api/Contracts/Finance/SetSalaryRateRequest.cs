using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Finance;

public sealed class SetSalaryRateRequest
{
    [Range(0, double.MaxValue)]
    public decimal BaseSalary { get; set; }

    public DateOnly EffectiveFrom { get; set; }
}
