using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Provisioning;

public sealed class ProvisioningAccessRequest
{
    [Required]
    public string AccessKey { get; set; } = string.Empty;
}
