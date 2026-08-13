namespace ClinicSystem.Domain.Entities;

public sealed class PatientClinicalNote
{
    public Guid Id { get; set; }

    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }

    public string NoteText { get; set; } = string.Empty;

    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public Patient Patient { get; set; } = null!;
    public DoctorProfile Doctor { get; set; } = null!;
}
