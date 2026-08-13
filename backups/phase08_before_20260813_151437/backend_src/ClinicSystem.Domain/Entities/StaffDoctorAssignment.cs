namespace ClinicSystem.Domain.Entities;

public sealed class StaffDoctorAssignment
{
    public Guid StaffUserId { get; set; }

    public Guid DoctorId { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime AssignedAtUtc { get; set; } = DateTime.UtcNow;

    public DoctorProfile Doctor { get; set; } = null!;
}
