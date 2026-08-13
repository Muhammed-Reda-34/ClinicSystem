using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Visits;

public sealed class CreateVisitTreatmentRequest
{
    public Guid DentalServiceId { get; set; }

    [Range(1, 100)]
    public int Quantity { get; set; } = 1;

    public List<int> ToothNumbers { get; set; } = [];

    [MaxLength(1500)]
    public string? Notes { get; set; }
}

public sealed class CreatePatientVisitRequest
{
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public Guid? AppointmentId { get; set; }

    public DateTime VisitDateUtc { get; set; }

    [MaxLength(4000)]
    public string? ClinicalNotes { get; set; }

    [Range(0, 100000000)]
    public decimal DiscountAmount { get; set; }

    [Range(0, 100000000)]
    public decimal ExtraAmount { get; set; }

    [MaxLength(1000)]
    public string? ExtraReason { get; set; }

    public DateTime? FollowUpAtUtc { get; set; }

    [MinLength(1)]
    public List<CreateVisitTreatmentRequest> Treatments { get; set; } = [];

    [Range(0, 100000000)]
    public decimal InitialPayment { get; set; }

    [MaxLength(100)]
    public string? PaymentMethod { get; set; }
}
