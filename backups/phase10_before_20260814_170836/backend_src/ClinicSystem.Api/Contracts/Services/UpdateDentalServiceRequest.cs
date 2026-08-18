using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Services;

public sealed class UpdateDentalServiceRequest
{
    [Required]
    [MaxLength(120)]
    public string Category { get; set; } = string.Empty;

    [Required]
    [MaxLength(250)]
    public string NameAr { get; set; } = string.Empty;

    [MaxLength(250)]
    public string? NameEn { get; set; }

    [Range(0, 100000000)]
    public decimal CurrentPrice { get; set; }

    [MaxLength(500)]
    public string? PricingNoteAr { get; set; }

    public bool IsActive { get; set; } = true;
}
