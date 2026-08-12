using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClinicSystem.Api.Contracts.Auth;
using ClinicSystem.Infrastructure.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace ClinicSystem.Api.Controllers;
[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController:ControllerBase
{
    private const string CookieName="clinic_refresh";
    private readonly AuthService _auth;private readonly IWebHostEnvironment _env;
    public AuthController(AuthService auth,IWebHostEnvironment env){_auth=auth;_env=env;}
    [HttpPost("login"),AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request,CancellationToken ct)
    {
        var s=await _auth.LoginAsync(request.Email,request.Password,ct);if(s is null)return Unauthorized(new{message="Invalid email or password."});SetCookie(s.RefreshToken,s.RefreshTokenExpiresAtUtc);return Ok(ToResponse(s));
    }
    [HttpPost("refresh"),AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> Refresh(CancellationToken ct)
    {
        if(!Request.Cookies.TryGetValue(CookieName,out var raw)||string.IsNullOrWhiteSpace(raw))return Unauthorized();
        var s=await _auth.RefreshAsync(raw,ct);if(s is null){DeleteCookie();return Unauthorized();}SetCookie(s.RefreshToken,s.RefreshTokenExpiresAtUtc);return Ok(ToResponse(s));
    }
    [HttpPost("logout"),AllowAnonymous]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        Request.Cookies.TryGetValue(CookieName,out var raw);await _auth.LogoutAsync(raw,ct);DeleteCookie();return NoContent();
    }
    [HttpGet("me"),Authorize]
    public async Task<ActionResult<AuthUserResponse>> Me()
    {
        var value=User.FindFirstValue(ClaimTypes.NameIdentifier)??User.FindFirstValue(JwtRegisteredClaimNames.Sub);if(!Guid.TryParse(value,out var id))return Unauthorized();
        var u=await _auth.GetUserAsync(id);if(u is null)return Unauthorized();return Ok(new AuthUserResponse(u.Id,u.FullName,u.Email,u.Roles));
    }
    private void SetCookie(string token,DateTime expires)=>Response.Cookies.Append(CookieName,token,new CookieOptions{HttpOnly=true,Secure=!_env.IsDevelopment(),SameSite=_env.IsDevelopment()?SameSiteMode.Lax:SameSiteMode.None,Expires=new DateTimeOffset(expires),IsEssential=true,Path="/api/v1/auth"});
    private void DeleteCookie()=>Response.Cookies.Delete(CookieName,new CookieOptions{HttpOnly=true,Secure=!_env.IsDevelopment(),SameSite=_env.IsDevelopment()?SameSiteMode.Lax:SameSiteMode.None,Path="/api/v1/auth"});
    private static AuthResponse ToResponse(AuthSession s)=>new(s.AccessToken,s.AccessTokenExpiresAtUtc,new(s.User.Id,s.User.FullName,s.User.Email,s.User.Roles));
}
