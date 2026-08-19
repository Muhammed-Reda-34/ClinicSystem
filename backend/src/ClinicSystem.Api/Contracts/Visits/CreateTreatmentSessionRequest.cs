using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Visits;

public sealed class CreateTreatmentSessionRequest
{
    public DateTime VisitDateUtc { get; set; }

    [MaxLength(1500)]
    public string? SessionNotes { get; set; }

    [MaxLength(4000)]
    public string? ClinicalNotes { get; set; }

    public DateTime? FollowUpAtUtc { get; set; }

    public bool CompletesTreatmentCase { get; set; }

    public bool IsHistoricalEntry { get; set; }
}
