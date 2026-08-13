using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClinicSystem.Api.Contracts.Auth;
using ClinicSystem.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
[EnableRateLimiting("auth")]
public sealed class AuthController
    : ControllerBase
{
    private const string RefreshCookieName =
        "clinic_refresh";

    private const string ClientHeaderName =
        "X-Clinic-Client";

    private const string ClientHeaderValue =
        "BlueDahabWeb";

    private readonly AuthService _authService;
    private readonly IWebHostEnvironment
        _environment;

    public AuthController(
        AuthService authService,
        IWebHostEnvironment environment)
    {
        _authService = authService;
        _environment = environment;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<
        ActionResult<AuthResponse>> Login(
            LoginRequest request,
            CancellationToken cancellationToken)
    {
        var session =
            await _authService.LoginAsync(
                request.Email,
                request.Password,
                GetClientIp(),
                cancellationToken);

        if (session is null)
        {
            return Unauthorized(
                new
                {
                    message =
                        "Invalid email or password."
                });
        }

        SetRefreshCookie(
            session.RefreshToken,
            session
                .RefreshTokenExpiresAtUtc);

        return Ok(
            ToResponse(session));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<
        ActionResult<AuthResponse>> Refresh(
            CancellationToken cancellationToken)
    {
        if (!HasTrustedClientHeader())
        {
            return BadRequest();
        }

        if (
            !Request.Cookies
                .TryGetValue(
                    RefreshCookieName,
                    out var refreshToken)
            || string.IsNullOrWhiteSpace(
                refreshToken)
        )
        {
            return Unauthorized();
        }

        var session =
            await _authService.RefreshAsync(
                refreshToken,
                GetClientIp(),
                cancellationToken);

        if (session is null)
        {
            DeleteRefreshCookie();
            return Unauthorized();
        }

        SetRefreshCookie(
            session.RefreshToken,
            session
                .RefreshTokenExpiresAtUtc);

        return Ok(
            ToResponse(session));
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout(
        CancellationToken cancellationToken)
    {
        if (!HasTrustedClientHeader())
        {
            return BadRequest();
        }

        Request.Cookies.TryGetValue(
            RefreshCookieName,
            out var refreshToken);

        await _authService.LogoutAsync(
            refreshToken,
            GetClientIp(),
            cancellationToken);

        DeleteRefreshCookie();

        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<
        ActionResult<AuthUserResponse>> Me()
    {
        var userIdValue =
            User.FindFirstValue(
                ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(
                JwtRegisteredClaimNames.Sub);

        if (
            !Guid.TryParse(
                userIdValue,
                out var userId)
        )
        {
            return Unauthorized();
        }

        var user =
            await _authService
                .GetUserAsync(userId);

        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(
            new AuthUserResponse(
                user.Id,
                user.FullName,
                user.Email,
                user.Roles));
    }

    private void SetRefreshCookie(
        string token,
        DateTime expiresAtUtc)
    {
        Response.Cookies.Append(
            RefreshCookieName,
            token,
            BuildCookieOptions(
                expiresAtUtc));
    }

    private void DeleteRefreshCookie()
    {
        Response.Cookies.Delete(
            RefreshCookieName,
            new CookieOptions
            {
                HttpOnly = true,
                Secure =
                    !_environment
                    .IsDevelopment(),
                SameSite =
                    _environment
                    .IsDevelopment()
                        ? SameSiteMode.Lax
                        : SameSiteMode.None,
                Path = "/api/v1/auth"
            });
    }

    private CookieOptions
        BuildCookieOptions(
            DateTime expiresAtUtc)
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure =
                !_environment
                .IsDevelopment(),
            SameSite =
                _environment
                .IsDevelopment()
                    ? SameSiteMode.Lax
                    : SameSiteMode.None,
            Expires =
                new DateTimeOffset(
                    expiresAtUtc),
            IsEssential = true,
            Path = "/api/v1/auth"
        };
    }

    private bool HasTrustedClientHeader()
    {
        return Request.Headers.TryGetValue(
            ClientHeaderName,
            out var value)
            && string.Equals(
                value.FirstOrDefault(),
                ClientHeaderValue,
                StringComparison.Ordinal);
    }

    private string? GetClientIp()
    {
        return HttpContext
            .Connection
            .RemoteIpAddress?
            .ToString();
    }

    private static AuthResponse ToResponse(
        AuthSession session)
    {
        return new AuthResponse(
            session.AccessToken,
            session
                .AccessTokenExpiresAtUtc,
            new AuthUserResponse(
                session.User.Id,
                session.User.FullName,
                session.User.Email,
                session.User.Roles));
    }
}
