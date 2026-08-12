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
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly JwtTokenService _jwt;
    private readonly JwtOptions _options;
    public AuthService(ClinicDbContext db,UserManager<ApplicationUser> userManager,JwtTokenService jwt,IOptions<JwtOptions> options)
    { _db=db;_userManager=userManager;_jwt=jwt;_options=options.Value; }
    public async Task<AuthSession?> LoginAsync(string email,string password,CancellationToken ct)
    {
        var user=await _userManager.FindByEmailAsync(email.Trim());
        if(user is null||!user.IsActive||!await _userManager.CheckPasswordAsync(user,password))return null;
        return await CreateSessionAsync(user,ct);
    }
    public async Task<AuthSession?> RefreshAsync(string raw,CancellationToken ct)
    {
        var hash=Hash(raw);
        await using var tx=await _db.Database.BeginTransactionAsync(ct);
        var stored=await _db.RefreshTokens.SingleOrDefaultAsync(x=>x.TokenHash==hash,ct);
        if(stored is null||!stored.IsActive)return null;
        var user=await _userManager.FindByIdAsync(stored.UserId.ToString());
        if(user is null||!user.IsActive)return null;
        stored.RevokedAtUtc=DateTime.UtcNow;
        var session=await CreateSessionAsync(user,ct,false);
        await _db.SaveChangesAsync(ct);await tx.CommitAsync(ct);return session;
    }
    public async Task LogoutAsync(string? raw,CancellationToken ct)
    {
        if(string.IsNullOrWhiteSpace(raw))return;
        var hash=Hash(raw);var stored=await _db.RefreshTokens.SingleOrDefaultAsync(x=>x.TokenHash==hash,ct);
        if(stored is null||stored.RevokedAtUtc is not null)return;
        stored.RevokedAtUtc=DateTime.UtcNow;await _db.SaveChangesAsync(ct);
    }
    public async Task<AuthUserDto?> GetUserAsync(Guid id)
    {
        var user=await _userManager.FindByIdAsync(id.ToString());if(user is null||!user.IsActive)return null;
        var roles=await _userManager.GetRolesAsync(user);return new(user.Id,user.FullName,user.Email??string.Empty,roles.ToArray());
    }
    private async Task<AuthSession> CreateSessionAsync(ApplicationUser user,CancellationToken ct,bool save=true)
    {
        var(access,expires)=await _jwt.CreateAccessTokenAsync(user);var raw=CreateRaw();var refreshExpires=DateTime.UtcNow.AddDays(_options.RefreshTokenDays);
        _db.RefreshTokens.Add(new(){Id=Guid.NewGuid(),UserId=user.Id,TokenHash=Hash(raw),CreatedAtUtc=DateTime.UtcNow,ExpiresAtUtc=refreshExpires});
        if(save)await _db.SaveChangesAsync(ct);
        var roles=await _userManager.GetRolesAsync(user);var dto=new AuthUserDto(user.Id,user.FullName,user.Email??string.Empty,roles.ToArray());
        return new(access,expires,raw,refreshExpires,dto);
    }
    private static string CreateRaw(){var bytes=RandomNumberGenerator.GetBytes(64);return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+','-').Replace('/','_');}
    private static string Hash(string token)=>Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
