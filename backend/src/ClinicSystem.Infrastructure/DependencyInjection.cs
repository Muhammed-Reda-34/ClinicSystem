using System.Text;
using ClinicSystem.Application.Common.Security;
using ClinicSystem.Infrastructure.Authentication;
using ClinicSystem.Infrastructure.Identity;
using ClinicSystem.Infrastructure.Persistence;
using ClinicSystem.Infrastructure.Users;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
namespace ClinicSystem.Infrastructure;
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var cs=configuration.GetConnectionString("DefaultConnection")??throw new InvalidOperationException("DefaultConnection missing.");
        var jwt=configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()??throw new InvalidOperationException("JWT config missing.");
        if(string.IsNullOrWhiteSpace(jwt.Key)||Encoding.UTF8.GetByteCount(jwt.Key)<32)throw new InvalidOperationException("Jwt:Key must be at least 32 bytes.");
        services.AddDataProtection();
        services.AddDbContext<ClinicDbContext>(o=>o.UseNpgsql(cs));
        services.AddIdentityCore<ApplicationUser>(o=>
        {
            o.User.RequireUniqueEmail=true; o.Password.RequiredLength=8; o.Password.RequireDigit=true;
            o.Password.RequireLowercase=true; o.Password.RequireUppercase=true; o.Password.RequireNonAlphanumeric=false;
            o.Lockout.AllowedForNewUsers=true; o.Lockout.MaxFailedAccessAttempts=5; o.Lockout.DefaultLockoutTimeSpan=TimeSpan.FromMinutes(15);
        }).AddRoles<IdentityRole<Guid>>().AddEntityFrameworkStores<ClinicDbContext>().AddSignInManager().AddDefaultTokenProviders();
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.AddScoped<JwtTokenService>(); services.AddScoped<AuthService>(); services.AddScoped<UserManagementService>();
        var key=new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key));
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o=>
        {
            o.RequireHttpsMetadata=false; o.SaveToken=false;
            o.TokenValidationParameters=new TokenValidationParameters{ValidateIssuer=true,ValidIssuer=jwt.Issuer,ValidateAudience=true,ValidAudience=jwt.Audience,ValidateIssuerSigningKey=true,IssuerSigningKey=key,ValidateLifetime=true,ClockSkew=TimeSpan.FromSeconds(30)};
        });
        services.AddAuthorizationBuilder()
            .AddPolicy(AuthorizationPolicies.OwnerOnly,p=>p.RequireRole(UserRoles.Owner))
            .AddPolicy(AuthorizationPolicies.DoctorAccess,p=>p.RequireRole(UserRoles.Owner,UserRoles.Doctor))
            .AddPolicy(AuthorizationPolicies.StaffAccess,p=>p.RequireRole(UserRoles.Owner,UserRoles.Secretary,UserRoles.Nurse));
        return services;
    }
}
