namespace ClinicSystem.Domain.Entities;

public sealed class EmployeeSalaryRate
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    public decimal BaseSalary { get; set; }
    public DateOnly EffectiveFrom { get; set; }

    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
