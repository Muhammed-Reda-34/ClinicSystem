namespace ClinicSystem.Infrastructure.Authentication;
public sealed record AuthUserDto(Guid Id, string FullName, string Email, IReadOnlyCollection<string> Roles);
