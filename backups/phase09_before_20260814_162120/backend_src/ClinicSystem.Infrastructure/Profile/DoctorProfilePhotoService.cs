using ClinicSystem.Infrastructure.Audit;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.Profile;

public sealed class DoctorProfilePhotoService
{
    public const int MaxBytes =
        5 * 1024 * 1024;

    private readonly ClinicDbContext _db;
    private readonly AuditService _audit;

    public DoctorProfilePhotoService(
        ClinicDbContext db,
        AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<DoctorProfilePhotoDto>
        GetAsync(
            Guid userId,
            CancellationToken cancellationToken)
    {
        var doctor =
            await _db.Doctors
            .AsNoTracking()
            .SingleOrDefaultAsync(
                x =>
                    x.UserId == userId
                    && x.IsActive,
                cancellationToken);

        if (
            doctor is null
            || doctor.ProfilePhotoData is null
            || doctor.ProfilePhotoData.Length == 0
            || string.IsNullOrWhiteSpace(
                doctor.ProfilePhotoContentType)
        )
        {
            return new DoctorProfilePhotoDto(
                false,
                null,
                null,
                null);
        }

        return new DoctorProfilePhotoDto(
            true,
            doctor.ProfilePhotoContentType,
            Convert.ToBase64String(
                doctor.ProfilePhotoData),
            doctor.ProfilePhotoUpdatedAtUtc);
    }

    public async Task<DoctorProfilePhotoWriteResult>
        UpdateAsync(
            Guid userId,
            byte[] data,
            string contentType,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        if (
            data.Length == 0
            || data.Length > MaxBytes
        )
        {
            return Fail(
                "INVALID_SIZE",
                "Profile image must be between 1 byte and 5 MB.");
        }

        var detectedType =
            DetectImageType(data);

        if (detectedType is null)
        {
            return Fail(
                "INVALID_IMAGE",
                "Only JPEG, PNG and WEBP images are allowed.");
        }

        var doctor =
            await _db.Doctors
            .SingleOrDefaultAsync(
                x =>
                    x.UserId == userId
                    && x.IsActive,
                cancellationToken);

        if (doctor is null)
        {
            return Fail(
                "DOCTOR_PROFILE_NOT_FOUND",
                "Doctor profile was not found.");
        }

        var old =
            new
            {
                doctor.ProfilePhotoContentType,
                doctor.ProfilePhotoUpdatedAtUtc,
                HadPhoto =
                    doctor.ProfilePhotoData != null
            };

        doctor.ProfilePhotoData = data;
        doctor.ProfilePhotoContentType =
            detectedType;
        doctor.ProfilePhotoUpdatedAtUtc =
            DateTime.UtcNow;

        _audit.Add(
            userId,
            "DoctorProfilePhotoUpdated",
            "DoctorProfile",
            doctor.Id.ToString(),
            old,
            new
            {
                doctor.ProfilePhotoContentType,
                doctor.ProfilePhotoUpdatedAtUtc,
                SizeBytes = data.Length
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        _ = contentType;

        return new DoctorProfilePhotoWriteResult(
            true,
            null,
            null);
    }

    public async Task<bool> DeleteAsync(
        Guid userId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var doctor =
            await _db.Doctors
            .SingleOrDefaultAsync(
                x =>
                    x.UserId == userId
                    && x.IsActive,
                cancellationToken);

        if (doctor is null)
        {
            return false;
        }

        var hadPhoto =
            doctor.ProfilePhotoData is not null;

        doctor.ProfilePhotoData = null;
        doctor.ProfilePhotoContentType = null;
        doctor.ProfilePhotoUpdatedAtUtc =
            DateTime.UtcNow;

        _audit.Add(
            userId,
            "DoctorProfilePhotoDeleted",
            "DoctorProfile",
            doctor.Id.ToString(),
            new { HadPhoto = hadPhoto },
            new { HadPhoto = false },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return true;
    }

    private static string? DetectImageType(
        byte[] data)
    {
        if (
            data.Length >= 3
            && data[0] == 0xFF
            && data[1] == 0xD8
            && data[2] == 0xFF
        )
        {
            return "image/jpeg";
        }

        if (
            data.Length >= 8
            && data[0] == 0x89
            && data[1] == 0x50
            && data[2] == 0x4E
            && data[3] == 0x47
            && data[4] == 0x0D
            && data[5] == 0x0A
            && data[6] == 0x1A
            && data[7] == 0x0A
        )
        {
            return "image/png";
        }

        if (
            data.Length >= 12
            && data[0] == 0x52
            && data[1] == 0x49
            && data[2] == 0x46
            && data[3] == 0x46
            && data[8] == 0x57
            && data[9] == 0x45
            && data[10] == 0x42
            && data[11] == 0x50
        )
        {
            return "image/webp";
        }

        return null;
    }

    private static DoctorProfilePhotoWriteResult Fail(
        string code,
        string message)
    {
        return new DoctorProfilePhotoWriteResult(
            false,
            code,
            message);
    }
}
