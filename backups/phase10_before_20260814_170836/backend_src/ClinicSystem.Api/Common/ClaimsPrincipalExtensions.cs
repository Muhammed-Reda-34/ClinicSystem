using System.Security.Claims;

namespace ClinicSystem.Api.Common;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserIdOrThrow(
        this ClaimsPrincipal user)
    {
        var value =
            user.FindFirstValue(
                ClaimTypes.NameIdentifier);

        return Guid.TryParse(
            value,
            out var id)
            ? id
            : throw new UnauthorizedAccessException(
                "Authenticated user id is invalid.");
    }

    public static IReadOnlyCollection<string>
        GetRoles(
            this ClaimsPrincipal user)
    {
        return user
            .FindAll(
                ClaimTypes.Role)
            .Select(
                x => x.Value)
            .Distinct()
            .ToArray();
    }
}
