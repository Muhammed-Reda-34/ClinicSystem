using ClinicSystem.Application.Common.Security;
using ClinicSystem.Domain.Entities;
using ClinicSystem.Infrastructure.Identity;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
namespace ClinicSystem.Infrastructure.Users;
public sealed class UserManagementService
{
    private readonly ClinicDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    public UserManagementService(ClinicDbContext db, UserManager<ApplicationUser> userManager) { _db=db; _userManager=userManager; }
    public async Task<IReadOnlyCollection<DoctorListItem>> GetDoctorsAsync(CancellationToken ct)
    {
        var rows = await _db.Doctors.AsNoTracking().OrderByDescending(x=>x.IsOwner).ThenBy(x=>x.CreatedAtUtc).ToListAsync(ct);
        var result = new List<DoctorListItem>();
        foreach (var doctor in rows)
        {
            var user = await _userManager.FindByIdAsync(doctor.UserId.ToString());
            if (user is not null) result.Add(new(doctor.Id,user.Id,user.FullName,doctor.Specialization??string.Empty,doctor.IsOwner,user.IsActive&&doctor.IsActive));
        }
        return result;
    }
    public async Task<IReadOnlyCollection<StaffListItem>> GetStaffAsync(CancellationToken ct)
    {
        var users = await _userManager.Users.AsNoTracking().OrderBy(x=>x.FullName).ToListAsync(ct);
        var assignments = await _db.StaffDoctorAssignments.AsNoTracking().Where(x=>x.IsActive).ToListAsync(ct);
        var doctors = (await GetDoctorsAsync(ct)).ToDictionary(x=>x.DoctorId);
        var result = new List<StaffListItem>();
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault(x=>UserRoles.StaffRoles.Contains(x));
            if (role is null) continue;
            var ds = assignments.Where(x=>x.StaffUserId==user.Id && doctors.ContainsKey(x.DoctorId))
                .Select(x=>new StaffDoctorItem(x.DoctorId,doctors[x.DoctorId].FullName)).ToArray();
            result.Add(new(user.Id,user.FullName,role,user.IsActive,ds));
        }
        return result;
    }
    public async Task<(bool Ok,string? Error,Guid? Id)> CreateDoctorAsync(CreateDoctorCommand c, CancellationToken ct)
    {
        if (await _userManager.FindByEmailAsync(c.Email.Trim()) is not null) return(false,"Email is already registered.",null);
        await using var tx=await _db.Database.BeginTransactionAsync(ct);
        var user=new ApplicationUser{Id=Guid.NewGuid(),FullName=c.FullName.Trim(),Email=c.Email.Trim(),UserName=c.Email.Trim(),EmailConfirmed=true,IsActive=true,CreatedAtUtc=DateTime.UtcNow};
        var cr=await _userManager.CreateAsync(user,c.Password); if(!cr.Succeeded)return(false,string.Join(" | ",cr.Errors.Select(x=>x.Description)),null);
        var rr=await _userManager.AddToRoleAsync(user,UserRoles.Doctor); if(!rr.Succeeded){await tx.RollbackAsync(ct);return(false,string.Join(" | ",rr.Errors.Select(x=>x.Description)),null);}
        var doctor=new DoctorProfile{Id=Guid.NewGuid(),UserId=user.Id,Specialization=c.Specialization?.Trim(),IsOwner=false,IsActive=true,CreatedAtUtc=DateTime.UtcNow};
        _db.Doctors.Add(doctor); await _db.SaveChangesAsync(ct); await tx.CommitAsync(ct); return(true,null,doctor.Id);
    }
    public async Task<(bool Ok,string? Error,Guid? Id)> CreateStaffAsync(
        CreateStaffCommand c,
        CancellationToken ct)
    {
        var role =
            c.Role.Equals(
                UserRoles.Secretary,
                StringComparison.OrdinalIgnoreCase)
                ? UserRoles.Secretary
                : c.Role.Equals(
                    UserRoles.Nurse,
                    StringComparison.OrdinalIgnoreCase)
                    ? UserRoles.Nurse
                    : null;

        if (role is null)
        {
            return (
                false,
                "Role must be Secretary or Nurse.",
                null);
        }

        if (string.IsNullOrWhiteSpace(c.FullName))
        {
            return (
                false,
                "Full name is required.",
                null);
        }

        if (string.IsNullOrWhiteSpace(c.Email))
        {
            return (
                false,
                "Email is required.",
                null);
        }

        var ids =
            c.DoctorIds
            .Distinct()
            .ToArray();

        if (ids.Length == 0)
        {
            return (
                false,
                "Select at least one doctor.",
                null);
        }

        var valid =
            await _db.Doctors
            .CountAsync(
                x =>
                    ids.Contains(x.Id)
                    && x.IsActive,
                ct);

        if (valid != ids.Length)
        {
            return (
                false,
                "Invalid doctor selection.",
                null);
        }

        var email =
            c.Email.Trim();

        if (
            await _userManager
                .FindByEmailAsync(email)
            is not null
        )
        {
            return (
                false,
                "Email is already registered.",
                null);
        }

        await using var tx =
            await _db.Database
            .BeginTransactionAsync(ct);

        var user =
            new ApplicationUser
            {
                Id = Guid.NewGuid(),
                FullName =
                    c.FullName.Trim(),
                Email = email,
                UserName = email,
                EmailConfirmed = true,
                IsActive = true,
                CreatedAtUtc =
                    DateTime.UtcNow
            };

        var createResult =
            await _userManager
            .CreateAsync(
                user,
                c.Password);

        if (!createResult.Succeeded)
        {
            await tx.RollbackAsync(ct);

            var identityMessage =
                string.Join(
                    " | ",
                    createResult.Errors
                    .Select(
                        x => x.Description));

            return (
                false,
                identityMessage,
                null);
        }

        var roleResult =
            await _userManager
            .AddToRoleAsync(
                user,
                role);

        if (!roleResult.Succeeded)
        {
            await tx.RollbackAsync(ct);

            return (
                false,
                string.Join(
                    " | ",
                    roleResult.Errors
                    .Select(
                        x => x.Description)),
                null);
        }

        foreach (var doctorId in ids)
        {
            _db.StaffDoctorAssignments.Add(
                new StaffDoctorAssignment
                {
                    StaffUserId = user.Id,
                    DoctorId = doctorId,
                    IsActive = true,
                    AssignedAtUtc =
                        DateTime.UtcNow
                });
        }

        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return (
            true,
            null,
            user.Id);
    }


public async Task<(bool Ok,string? Error)> ReplaceStaffDoctorsAsync(
    Guid staffUserId,
    IReadOnlyCollection<Guid> doctorIds,
    CancellationToken ct)
{
    var ids = doctorIds.Distinct().ToArray();

    if (ids.Length == 0)
    {
        return (false, "Select at least one doctor.");
    }

    var user = await _userManager.FindByIdAsync(
        staffUserId.ToString());

    if (user is null)
    {
        return (false, "Staff user was not found.");
    }

    var roles = await _userManager.GetRolesAsync(user);

    if (!roles.Any(x => UserRoles.StaffRoles.Contains(x)))
    {
        return (false, "User is not Secretary or Nurse.");
    }

    var validDoctorCount =
        await _db.Doctors.CountAsync(
            x => ids.Contains(x.Id) && x.IsActive,
            ct);

    if (validDoctorCount != ids.Length)
    {
        return (false, "Invalid doctor selection.");
    }

    await using var tx =
        await _db.Database.BeginTransactionAsync(ct);

    var existing =
        await _db.StaffDoctorAssignments
        .Where(x => x.StaffUserId == staffUserId)
        .ToListAsync(ct);

    foreach (var assignment in existing)
    {
        assignment.IsActive =
            ids.Contains(assignment.DoctorId);
    }

    var existingDoctorIds =
        existing.Select(x => x.DoctorId).ToHashSet();

    foreach (var doctorId in ids)
    {
        if (existingDoctorIds.Contains(doctorId))
        {
            continue;
        }

        _db.StaffDoctorAssignments.Add(
            new StaffDoctorAssignment
            {
                StaffUserId = staffUserId,
                DoctorId = doctorId,
                IsActive = true,
                AssignedAtUtc = DateTime.UtcNow
            });
    }

    await _db.SaveChangesAsync(ct);
    await tx.CommitAsync(ct);

    return (true, null);
}

}
