using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Domain.Entities;

public sealed class PatientAttachment
{
    public Guid Id { get; set; }

    public Guid PatientId { get; set; }
    public Guid? DoctorId { get; set; }

    public PatientAttachmentCategory Category { get; set; }

    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }

    public byte[] Data { get; set; } = [];

    public string? Notes { get; set; }

    public Guid UploadedByUserId { get; set; }
    public DateTime UploadedAtUtc { get; set; } = DateTime.UtcNow;

    public Patient Patient { get; set; } = null!;
}
