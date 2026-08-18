using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Provisioning;

public sealed class ProvisionStaffRequest
{
    [Required]
    public string AccessKey { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string FullName { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [Required]
    public string Role { get; set; } = string.Empty;

    [MinLength(1)]
    public List<Guid> DoctorIds { get; set; } = [];
}
