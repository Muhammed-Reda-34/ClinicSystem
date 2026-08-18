namespace ClinicSystem.Domain.Entities;

public sealed class DoctorProfile
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    public string? Specialization { get; set; }
    public bool IsOwner { get; set; }
    public bool IsActive { get; set; } = true;

    public byte[]? ProfilePhotoData { get; set; }
    public string? ProfilePhotoContentType { get; set; }
    public DateTime? ProfilePhotoUpdatedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<StaffDoctorAssignment> StaffAssignments { get; set; }
        = new List<StaffDoctorAssignment>();
}
