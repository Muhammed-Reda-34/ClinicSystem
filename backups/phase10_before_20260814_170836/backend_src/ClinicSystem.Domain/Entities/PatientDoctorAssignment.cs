namespace ClinicSystem.Domain.Entities;

public sealed class PatientDoctorAssignment
{
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public Guid AssignedByUserId { get; set; }
    public DateTime AssignedAtUtc { get; set; } = DateTime.UtcNow;

    public Patient Patient { get; set; } = null!;
    public DoctorProfile Doctor { get; set; } = null!;
}
