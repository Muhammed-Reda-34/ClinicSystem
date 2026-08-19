using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Visits;

public sealed class VoidPatientVisitRequest
{
    [Required]
    [MaxLength(1000)]
    public string Reason { get; set; } = string.Empty;
}
