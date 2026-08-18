using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Lab;

public sealed class CreateLabOrderRequest
{
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public Guid? VisitId { get; set; }

    [MaxLength(3000)]
    public string? CaseDescription { get; set; }

    public List<string> WorkTypes { get; set; } = [];
    public List<int> ToothNumbers { get; set; } = [];
    public List<string> MaterialOptions { get; set; } = [];

    [MaxLength(100)]
    public string? Shade { get; set; }

    public bool DigitalPhotosSent { get; set; }

    [MaxLength(50)]
    public string? ValueLevel { get; set; }

    [MaxLength(50)]
    public string? OcclusalStaining { get; set; }

    [MaxLength(5000)]
    public string? Instructions { get; set; }
}
