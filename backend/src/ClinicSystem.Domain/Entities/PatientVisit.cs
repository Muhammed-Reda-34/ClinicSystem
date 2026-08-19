namespace ClinicSystem.Domain.Entities;

public sealed class PatientVisit
{
    public Guid Id { get; set; }

    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public Guid? AppointmentId { get; set; }

    public DateTime VisitDateUtc { get; set; } = DateTime.UtcNow;

    public string? ClinicalNotes { get; set; }

    public decimal DiscountAmount { get; set; }
    public decimal ExtraAmount { get; set; }
    public string? ExtraReason { get; set; }

    public DateTime? FollowUpAtUtc { get; set; }
    public DateTime? FollowUpCompletedAtUtc { get; set; }
    public Guid? FollowUpCompletedByUserId { get; set; }

    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    // Soft-delete / voiding keeps the audit trail and prevents accidental
    // destruction of clinical history. Voided visits are excluded from
    // normal patient, debt and finance queries.
    public bool IsVoided { get; set; }
    public DateTime? VoidedAtUtc { get; set; }
    public Guid? VoidedByUserId { get; set; }
    public string? VoidReason { get; set; }

    public Patient Patient { get; set; } = null!;
    public DoctorProfile Doctor { get; set; } = null!;
    public Appointment? Appointment { get; set; }

    public ICollection<VisitTreatmentItem> TreatmentItems { get; set; }
        = new List<VisitTreatmentItem>();

    public ICollection<Payment> Payments { get; set; }
        = new List<Payment>();
}
