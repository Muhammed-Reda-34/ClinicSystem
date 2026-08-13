namespace ClinicSystem.Api.Contracts.Auth;
public sealed record AuthResponse(string AccessToken, DateTime AccessTokenExpiresAtUtc, AuthUserResponse User);
public sealed record AuthUserResponse(Guid Id,string FullName,string Email,IReadOnlyCollection<string> Roles);
