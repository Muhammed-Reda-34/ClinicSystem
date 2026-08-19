using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Visits;

public sealed class UpdateVisitTreatmentRequest
{
    public Guid? TreatmentItemId { get; set; }
    public Guid DentalServiceId { get; set; }

    [Range(1, 100)]
    public int Quantity { get; set; } = 1;

    public List<int> ToothNumbers { get; set; } = [];

    [MaxLength(1500)]
    public string? Notes { get; set; }

    public bool CompletesTreatmentCase { get; set; } = true;
}

public sealed class UpdatePatientVisitRequest
{
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
    public List<UpdateVisitTreatmentRequest> Treatments { get; set; } = [];

    public bool IsHistoricalEntry { get; set; }
}
