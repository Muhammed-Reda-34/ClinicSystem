using ClinicSystem.Application.Common.Security;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.Context;

public sealed class DoctorScopeService
{
    private readonly ClinicDbContext _db;

    public DoctorScopeService(ClinicDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyCollection<AccessibleDoctorDto>> GetAccessibleDoctorsAsync(
        Guid userId,
        IReadOnlyCollection<string> roles,
        CancellationToken cancellationToken)
    {
        if (roles.Contains(UserRoles.Owner))
        {
            return await (
                from doctor in _db.Doctors.AsNoTracking()
                join user in _db.Users.AsNoTracking() on doctor.UserId equals user.Id
                where doctor.IsActive && user.IsActive
                orderby doctor.IsOwner descending, user.FullName
                select new AccessibleDoctorDto(
                    doctor.Id,
                    user.FullName,
                    doctor.Specialization ?? string.Empty,
                    doctor.IsOwner))
                .ToListAsync(cancellationToken);
        }

        if (roles.Contains(UserRoles.Doctor))
        {
            return await (
                from doctor in _db.Doctors.AsNoTracking()
                join user in _db.Users.AsNoTracking() on doctor.UserId equals user.Id
                where doctor.UserId == userId && doctor.IsActive && user.IsActive
                select new AccessibleDoctorDto(
                    doctor.Id,
                    user.FullName,
                    doctor.Specialization ?? string.Empty,
                    doctor.IsOwner))
                .ToListAsync(cancellationToken);
        }

        return await (
            from assignment in _db.StaffDoctorAssignments.AsNoTracking()
            join doctor in _db.Doctors.AsNoTracking() on assignment.DoctorId equals doctor.Id
            join user in _db.Users.AsNoTracking() on doctor.UserId equals user.Id
            where assignment.StaffUserId == userId
                  && assignment.IsActive
                  && doctor.IsActive
                  && user.IsActive
            orderby doctor.IsOwner descending, user.FullName
            select new AccessibleDoctorDto(
                doctor.Id,
                user.FullName,
                doctor.Specialization ?? string.Empty,
                doctor.IsOwner))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<Guid>> ResolveDoctorIdsAsync(
        Guid userId,
        IReadOnlyCollection<string> roles,
        Guid? requestedDoctorId,
        CancellationToken cancellationToken)
    {
        var accessible = await GetAccessibleDoctorsAsync(userId, roles, cancellationToken);

        if (requestedDoctorId is not null)
        {
            if (accessible.All(x => x.DoctorId != requestedDoctorId.Value))
            {
                throw new UnauthorizedAccessException(
                    "Doctor scope is not allowed for this user.");
            }

            return [requestedDoctorId.Value];
        }

        return accessible.Select(x => x.DoctorId).ToArray();
    }

    public async Task<bool> CanAccessAllAsync(
        Guid userId,
        IReadOnlyCollection<string> roles,
        IReadOnlyCollection<Guid> doctorIds,
        CancellationToken cancellationToken)
    {
        var accessible = await GetAccessibleDoctorsAsync(
            userId,
            roles,
            cancellationToken);

        var accessibleIds = accessible
            .Select(x => x.DoctorId)
            .ToHashSet();

        return doctorIds.All(accessibleIds.Contains);
    }
}
