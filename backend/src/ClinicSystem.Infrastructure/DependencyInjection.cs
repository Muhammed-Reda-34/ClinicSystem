using System.Text;
using ClinicSystem.Application.Common.Security;
using ClinicSystem.Infrastructure.Audit;
using ClinicSystem.Infrastructure.Authentication;
using ClinicSystem.Infrastructure.Context;
using ClinicSystem.Infrastructure.Identity;
using ClinicSystem.Infrastructure.Patients;
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
    public static IServiceCollection
        AddInfrastructure(
            this IServiceCollection services,
            IConfiguration configuration)
    {
        var connectionString =
            configuration
            .GetConnectionString(
                "DefaultConnection")
            ?? throw new InvalidOperationException(
                "Connection string 'DefaultConnection' was not found.");

        var jwtOptions =
            configuration
            .GetSection(
                JwtOptions.SectionName)
            .Get<JwtOptions>()
            ?? throw new InvalidOperationException(
                "JWT configuration was not found.");

        if (
            string.IsNullOrWhiteSpace(
                jwtOptions.Key)
            || Encoding.UTF8
                .GetByteCount(
                    jwtOptions.Key)
                < 32
        )
        {
            throw new InvalidOperationException(
                "Jwt:Key must be at least 32 bytes long.");
        }

        services.AddDataProtection();

        services.AddDbContext<
            ClinicDbContext>(
            options =>
                options.UseNpgsql(
                    connectionString));

        services
            .AddIdentityCore<
                ApplicationUser>(
                options =>
                {
                    options.User
                        .RequireUniqueEmail =
                        true;

                    options.Password
                        .RequiredLength = 8;

                    options.Password
                        .RequireDigit = true;

                    options.Password
                        .RequireLowercase =
                        true;

                    options.Password
                        .RequireUppercase =
                        true;

                    options.Password
                        .RequireNonAlphanumeric =
                        false;

                    options.Lockout
                        .AllowedForNewUsers =
                        true;

                    options.Lockout
                        .MaxFailedAccessAttempts =
                        5;

                    options.Lockout
                        .DefaultLockoutTimeSpan =
                        TimeSpan
                        .FromMinutes(15);
                })
            .AddRoles<
                IdentityRole<Guid>>()
            .AddEntityFrameworkStores<
                ClinicDbContext>()
            .AddSignInManager()
            .AddDefaultTokenProviders();

        services.Configure<JwtOptions>(
            configuration.GetSection(
                JwtOptions.SectionName));

        services.AddScoped<
            JwtTokenService>();

        services.AddScoped<
            AuthService>();

        services.AddScoped<
            UserManagementService>();

        services.AddScoped<
            DoctorScopeService>();

        services.AddScoped<
            PatientService>();

        services.AddScoped<
            AuditService>();

        var signingKey =
            new SymmetricSecurityKey(
                Encoding.UTF8
                .GetBytes(
                    jwtOptions.Key));

        services
            .AddAuthentication(
                JwtBearerDefaults
                    .AuthenticationScheme)
            .AddJwtBearer(
                options =>
                {
                    options
                        .RequireHttpsMetadata =
                        false;

                    options.SaveToken =
                        false;

                    options
                        .TokenValidationParameters =
                        new TokenValidationParameters
                        {
                            ValidateIssuer =
                                true,
                            ValidIssuer =
                                jwtOptions.Issuer,

                            ValidateAudience =
                                true,
                            ValidAudience =
                                jwtOptions.Audience,

                            ValidateIssuerSigningKey =
                                true,
                            IssuerSigningKey =
                                signingKey,

                            ValidateLifetime =
                                true,

                            ClockSkew =
                                TimeSpan
                                .FromSeconds(30)
                        };
                });

        services
            .AddAuthorizationBuilder()
            .AddPolicy(
                AuthorizationPolicies
                    .OwnerOnly,
                policy =>
                    policy.RequireRole(
                        UserRoles.Owner))
            .AddPolicy(
                AuthorizationPolicies
                    .DoctorAccess,
                policy =>
                    policy.RequireRole(
                        UserRoles.Owner,
                        UserRoles.Doctor))
            .AddPolicy(
                AuthorizationPolicies
                    .StaffAccess,
                policy =>
                    policy.RequireRole(
                        UserRoles.Owner,
                        UserRoles.Secretary,
                        UserRoles.Nurse))
            .AddPolicy(
                AuthorizationPolicies
                    .PatientRead,
                policy =>
                    policy.RequireRole(
                        UserRoles.Owner,
                        UserRoles.Doctor,
                        UserRoles.Secretary,
                        UserRoles.Nurse))
            .AddPolicy(
                AuthorizationPolicies
                    .PatientRegister,
                policy =>
                    policy.RequireRole(
                        UserRoles.Owner,
                        UserRoles.Doctor,
                        UserRoles.Secretary,
                        UserRoles.Nurse))
            .AddPolicy(
                AuthorizationPolicies
                    .PatientEdit,
                policy =>
                    policy.RequireRole(
                        UserRoles.Owner,
                        UserRoles.Doctor,
                        UserRoles.Secretary,
                        UserRoles.Nurse));

        return services;
    }
}
