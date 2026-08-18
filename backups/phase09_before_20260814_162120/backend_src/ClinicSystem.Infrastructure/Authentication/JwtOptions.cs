namespace ClinicSystem.Infrastructure.Authentication;
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";
    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = "ClinicSystem.Api";
    public string Audience { get; set; } = "ClinicSystem.Web";
    public int AccessTokenMinutes { get; set; } = 30;
    public int RefreshTokenDays { get; set; } = 14;
}
