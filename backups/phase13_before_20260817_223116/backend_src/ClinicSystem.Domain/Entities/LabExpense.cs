namespace ClinicSystem.Domain.Entities;

public sealed class LabExpense
{
    public Guid Id { get; set; }

    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public Guid? VisitId { get; set; }
    public Guid? LabOrderId { get; set; }

    public string ServiceOrItemName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime ExpenseDateUtc { get; set; }
    public string? Notes { get; set; }

    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public Patient Patient { get; set; } = null!;
    public DoctorProfile Doctor { get; set; } = null!;
    public PatientVisit? Visit { get; set; }
    public LabOrder? LabOrder { get; set; }
}
