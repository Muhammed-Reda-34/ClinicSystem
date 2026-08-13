namespace ClinicSystem.Domain.Entities;

public sealed class Payment
{
    public Guid Id { get; set; }

    public Guid VisitId { get; set; }
    public Guid DoctorId { get; set; }

    public decimal Amount { get; set; }

    public string? Method { get; set; }
    public string? Notes { get; set; }

    public DateTime PaidAtUtc { get; set; } = DateTime.UtcNow;

    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public PatientVisit Visit { get; set; } = null!;
    public DoctorProfile Doctor { get; set; } = null!;
}
