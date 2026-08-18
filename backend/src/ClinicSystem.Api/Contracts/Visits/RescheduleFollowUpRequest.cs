using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Visits;

public sealed class RescheduleFollowUpRequest
{
    public DateTime FollowUpAtUtc { get; set; }

    [MaxLength(1000)]
    public string? Reason { get; set; }
}
