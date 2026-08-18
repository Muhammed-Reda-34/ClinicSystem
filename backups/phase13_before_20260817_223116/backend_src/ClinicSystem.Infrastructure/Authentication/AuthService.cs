using System.Security.Cryptography;
using System.Text;
using ClinicSystem.Infrastructure.Identity;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ClinicSystem.Infrastructure.Authentication;

public sealed class AuthService
{
    private readonly ClinicDbContext _db;
    private readonly UserManager<ApplicationUser>
        _userManager;
    private readonly SignInManager<ApplicationUser>
        _signInManager;
    private readonly JwtTokenService
        _jwtTokenService;
    private readonly JwtOptions
        _jwtOptions;

    public AuthService(
        ClinicDbContext db,
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        JwtTokenService jwtTokenService,
        IOptions<JwtOptions> jwtOptions)
    {
        _db = db;
        _userManager = userManager;
        _signInManager = signInManager;
        _jwtTokenService = jwtTokenService;
        _jwtOptions = jwtOptions.Value;
    }

    public async Task<AuthSession?> LoginAsync(
        string email,
        string password,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var user =
            await _userManager.FindByEmailAsync(
                email.Trim());

        if (user is null || !user.IsActive)
        {
            return null;
        }

        var signInResult =
            await _signInManager
                .CheckPasswordSignInAsync(
                    user,
                    password,
                    lockoutOnFailure: true);

        if (!signInResult.Succeeded)
        {
            return null;
        }

        return await CreateSessionAsync(
            user,
            ipAddress,
            cancellationToken);
    }

    public async Task<AuthSession?> RefreshAsync(
        string rawRefreshToken,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var tokenHash =
            HashToken(rawRefreshToken);

        await using var transaction =
            await _db.Database
                .BeginTransactionAsync(
                    cancellationToken);

        var storedToken =
            await _db.RefreshTokens
            .AsNoTracking()
            .SingleOrDefaultAsync(
                x =>
                    x.TokenHash
                    == tokenHash,
                cancellationToken);

        var now = DateTime.UtcNow;

        if (
            storedToken is null
            || storedToken.RevokedAtUtc
                is not null
            || storedToken.ExpiresAtUtc
                <= now
        )
        {
            return null;
        }

        var user =
            await _userManager
            .FindByIdAsync(
                storedToken
                    .UserId
                    .ToString());

        if (
            user is null
            || !user.IsActive
            || await _userManager
                .IsLockedOutAsync(user)
        )
        {
            return null;
        }

        var revokedRows =
            await _db.RefreshTokens
            .Where(
                x =>
                    x.Id
                    == storedToken.Id
                    && x.RevokedAtUtc
                        == null
                    && x.ExpiresAtUtc
                        > now)
            .ExecuteUpdateAsync(
                setters =>
                    setters
                    .SetProperty(
                        x =>
                            x.RevokedAtUtc,
                        now)
                    .SetProperty(
                        x =>
                            x.RevokedByIp,
                        ipAddress),
                cancellationToken);

        if (revokedRows != 1)
        {
            await transaction
                .RollbackAsync(
                    cancellationToken);

            return null;
        }

        var session =
            await CreateSessionAsync(
                user,
                ipAddress,
                cancellationToken,
                saveChanges: false);

        await _db.SaveChangesAsync(
            cancellationToken);

        await transaction.CommitAsync(
            cancellationToken);

        return session;
    }

    public async Task LogoutAsync(
        string? rawRefreshToken,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        if (
            string.IsNullOrWhiteSpace(
                rawRefreshToken)
        )
        {
            return;
        }

        var tokenHash =
            HashToken(rawRefreshToken);

        var storedToken =
            await _db.RefreshTokens
            .SingleOrDefaultAsync(
                x =>
                    x.TokenHash
                    == tokenHash,
                cancellationToken);

        if (
            storedToken is null
            || storedToken
                .RevokedAtUtc
                is not null
        )
        {
            return;
        }

        storedToken.RevokedAtUtc =
            DateTime.UtcNow;

        storedToken.RevokedByIp =
            ipAddress;

        await _db.SaveChangesAsync(
            cancellationToken);
    }

    public async Task<AuthUserDto?>
        GetUserAsync(Guid userId)
    {
        var user =
            await _userManager
                .FindByIdAsync(
                    userId.ToString());

        if (user is null || !user.IsActive)
        {
            return null;
        }

        return await MapUserAsync(user);
    }

    private async Task<AuthSession>
        CreateSessionAsync(
            ApplicationUser user,
            string? ipAddress,
            CancellationToken cancellationToken,
            bool saveChanges = true)
    {
        var (
            accessToken,
            accessExpiresAtUtc
        ) =
            await _jwtTokenService
            .CreateAccessTokenAsync(user);

        var rawRefreshToken =
            CreateRefreshToken();

        var refreshExpiresAtUtc =
            DateTime.UtcNow.AddDays(
                _jwtOptions
                    .RefreshTokenDays);

        _db.RefreshTokens.Add(
            new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TokenHash =
                    HashToken(
                        rawRefreshToken),
                CreatedAtUtc =
                    DateTime.UtcNow,
                ExpiresAtUtc =
                    refreshExpiresAtUtc,
                CreatedByIp =
                    ipAddress
            });

        if (saveChanges)
        {
            await _db.SaveChangesAsync(
                cancellationToken);
        }

        return new AuthSession(
            accessToken,
            accessExpiresAtUtc,
            rawRefreshToken,
            refreshExpiresAtUtc,
            await MapUserAsync(user));
    }

    private async Task<AuthUserDto>
        MapUserAsync(
            ApplicationUser user)
    {
        var roles =
            await _userManager
                .GetRolesAsync(user);

        return new AuthUserDto(
            user.Id,
            user.FullName,
            user.Email ?? string.Empty,
            roles.ToArray());
    }

    private static string
        CreateRefreshToken()
    {
        var bytes =
            RandomNumberGenerator
            .GetBytes(64);

        return Convert
            .ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string HashToken(
        string token)
    {
        var bytes =
            SHA256.HashData(
                Encoding.UTF8
                .GetBytes(token));

        return Convert.ToHexString(bytes);
    }
}
