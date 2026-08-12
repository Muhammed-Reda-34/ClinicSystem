namespace ClinicSystem.Domain.Entities;

public sealed class LabOrder
{
    public Guid Id { get; set; }

    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public Guid? VisitId { get; set; }

    public string SerialNumber { get; set; } = string.Empty;
    public string? CaseDescription { get; set; }

    public string WorkTypesCsv { get; set; } = string.Empty;
    public string MaterialOptionsCsv { get; set; } = string.Empty;

    public string? Shade { get; set; }
    public bool DigitalPhotosSent { get; set; }

    public string? ValueLevel { get; set; }
    public string? OcclusalStaining { get; set; }
    public string? Instructions { get; set; }

    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public Patient Patient { get; set; } = null!;
    public DoctorProfile Doctor { get; set; } = null!;
    public PatientVisit? Visit { get; set; }

    public ICollection<LabOrderTooth> Teeth { get; set; }
        = new List<LabOrderTooth>();
}
