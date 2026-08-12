namespace ClinicSystem.Infrastructure.Authentication;
public sealed record AuthSession(string AccessToken, DateTime AccessTokenExpiresAtUtc, string RefreshToken, DateTime RefreshTokenExpiresAtUtc, AuthUserDto User);
