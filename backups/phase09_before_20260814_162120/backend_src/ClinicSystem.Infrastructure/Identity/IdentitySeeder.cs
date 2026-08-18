using ClinicSystem.Application.Common.Security;
using ClinicSystem.Domain.Entities;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
namespace ClinicSystem.Infrastructure.Identity;
public static class IdentitySeeder
{
    public static async Task SeedBootstrapOwnerAsync(this IServiceProvider services, IConfiguration configuration)
    {
        var options = configuration.GetSection(BootstrapOwnerOptions.SectionName).Get<BootstrapOwnerOptions>();
        if (options is null || !options.Enabled) return;
        if (string.IsNullOrWhiteSpace(options.Email) || string.IsNullOrWhiteSpace(options.Password))
            throw new InvalidOperationException("BootstrapOwner Email/Password are required.");
        using var scope = services.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var db = scope.ServiceProvider.GetRequiredService<ClinicDbContext>();
        var user = await userManager.FindByEmailAsync(options.Email.Trim());
        if (user is null)
        {
            user = new ApplicationUser
            {
                Id = Guid.NewGuid(), FullName = options.FullName.Trim(), Email = options.Email.Trim(),
                UserName = options.Email.Trim(), EmailConfirmed = true, IsActive = true, CreatedAtUtc = DateTime.UtcNow
            };
            var created = await userManager.CreateAsync(user, options.Password);
            if (!created.Succeeded) throw new InvalidOperationException(string.Join(" | ", created.Errors.Select(x => x.Description)));
            var roles = await userManager.AddToRolesAsync(user, [UserRoles.Owner, UserRoles.Doctor]);
            if (!roles.Succeeded) throw new InvalidOperationException(string.Join(" | ", roles.Errors.Select(x => x.Description)));
        }
        if (!await db.Doctors.AnyAsync(x => x.UserId == user.Id))
        {
            db.Doctors.Add(new DoctorProfile
            {
                Id = Guid.NewGuid(), UserId = user.Id, Specialization = options.Specialization,
                IsOwner = true, IsActive = true, CreatedAtUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }
    }
}
