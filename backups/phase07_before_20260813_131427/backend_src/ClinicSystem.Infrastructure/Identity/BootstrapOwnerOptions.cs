namespace ClinicSystem.Infrastructure.Identity;
public sealed class BootstrapOwnerOptions
{
    public const string SectionName = "BootstrapOwner";
    public bool Enabled { get; set; }
    public string FullName { get; set; } = "Dr Khaled Hassan";
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Specialization { get; set; } = "Dentistry";
}
