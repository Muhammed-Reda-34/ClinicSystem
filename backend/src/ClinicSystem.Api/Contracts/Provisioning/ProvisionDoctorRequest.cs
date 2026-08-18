using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Provisioning;

public sealed class ProvisionDoctorRequest
{
    [Required]
    public string AccessKey { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string FullName { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [MaxLength(150)]
    public string? Specialization { get; set; }
}
