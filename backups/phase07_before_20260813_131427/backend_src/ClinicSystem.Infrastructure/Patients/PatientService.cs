using System.Security.Cryptography;
using ClinicSystem.Domain.Entities;
using ClinicSystem.Domain.Enums;
using ClinicSystem.Infrastructure.Audit;
using ClinicSystem.Infrastructure.Common;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.Patients;

public sealed class PatientService
{
    private readonly ClinicDbContext _db;
    private readonly AuditService _audit;

    public PatientService(
        ClinicDbContext db,
        AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<PagedPatientsDto> SearchAsync(
        IReadOnlyCollection<Guid> allowedDoctorIds,
        string? search,
        int page,
        int pageSize,
        bool? blacklisted,
        CancellationToken cancellationToken)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 10, 100);

        if (allowedDoctorIds.Count == 0)
        {
            return new PagedPatientsDto(
                page,
                pageSize,
                0,
                []);
        }

        var query = _db.Patients
            .AsNoTracking()
            .Where(patient =>
                !patient.IsArchived
                && patient.DoctorAssignments.Any(
                    assignment =>
                        allowedDoctorIds.Contains(
                            assignment.DoctorId)));

        if (blacklisted is not null)
        {
            query = query.Where(
                x => x.IsBlacklisted == blacklisted.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            var normalizedPhone =
                TextNormalizer.NormalizePhone(term);

            query = query.Where(patient =>
                patient.PatientCode == term
                || patient.FormNumber == term
                || EF.Functions.ILike(
                    patient.FullName,
                    $"%{term}%")
                || (
                    normalizedPhone.Length >= 3
                    && patient.NormalizedPhone.Contains(
                        normalizedPhone)
                ));
        }

        var totalCount =
            await query.CountAsync(cancellationToken);

        var rows = await query
            .OrderByDescending(x => x.UpdatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(patient => new
            {
                patient.Id,
                patient.PatientCode,
                patient.FormNumber,
                patient.FullName,
                patient.PhoneNumber,
                patient.DateOfBirth,
                patient.ProfileStatus,
                patient.IsBlacklisted,
                patient.NoShowCount
            })
            .ToListAsync(cancellationToken);

        var patientIds =
            rows.Select(x => x.Id).ToArray();

        var doctors =
            await GetDoctorsForPatientsAsync(
                patientIds,
                allowedDoctorIds,
                cancellationToken);

        var items = rows
            .Select(row => new PatientListItemDto(
                row.Id,
                row.PatientCode,
                row.FormNumber,
                row.FullName,
                row.PhoneNumber,
                row.DateOfBirth,
                AgeCalculator.Calculate(
                    row.DateOfBirth),
                row.ProfileStatus,
                row.IsBlacklisted,
                row.NoShowCount,
                doctors.GetValueOrDefault(
                    row.Id,
                    [])))
            .ToArray();

        return new PagedPatientsDto(
            page,
            pageSize,
            totalCount,
            items);
    }

    public async Task<PatientDetailsDto?> GetByIdAsync(
        Guid patientId,
        IReadOnlyCollection<Guid> allowedDoctorIds,
        CancellationToken cancellationToken)
    {
        if (allowedDoctorIds.Count == 0)
        {
            return null;
        }

        var patient = await _db.Patients
            .AsNoTracking()
            .SingleOrDefaultAsync(
                x =>
                    x.Id == patientId
                    && x.DoctorAssignments.Any(
                        a =>
                            allowedDoctorIds.Contains(
                                a.DoctorId)),
                cancellationToken);

        if (patient is null)
        {
            return null;
        }

        var doctors =
            await GetDoctorsForPatientsAsync(
                [patient.Id],
                allowedDoctorIds,
                cancellationToken);

        return new PatientDetailsDto(
            patient.Id,
            patient.PatientCode,
            patient.FormNumber,
            patient.FullName,
            patient.PhoneNumber,
            patient.DateOfBirth,
            AgeCalculator.Calculate(
                patient.DateOfBirth),
            patient.Gender,
            patient.Address,
            patient.AdministrativeNotes,
            patient.ProfileStatus,
            patient.IsBlacklisted,
            patient.NoShowCount,
            patient.CreatedAtUtc,
            patient.UpdatedAtUtc,
            doctors.GetValueOrDefault(
                patient.Id,
                []));
    }

    public async Task<PhoneCheckDto> CheckPhoneAsync(
        string phoneNumber,
        IReadOnlyCollection<Guid> allowedDoctorIds,
        CancellationToken cancellationToken)
    {
        var normalized =
            TextNormalizer.NormalizePhone(
                phoneNumber);

        if (normalized.Length < 7)
        {
            return new PhoneCheckDto(
                false,
                false,
                []);
        }

        var allMatches = await _db.Patients
            .AsNoTracking()
            .Where(
                x =>
                    x.NormalizedPhone
                    == normalized)
            .Select(x => new
            {
                x.Id,
                x.PatientCode,
                x.FullName,
                x.PhoneNumber,
                x.IsBlacklisted,
                IsVisible =
                    x.DoctorAssignments.Any(
                        a =>
                            allowedDoctorIds
                            .Contains(
                                a.DoctorId))
            })
            .Take(20)
            .ToListAsync(
                cancellationToken);

        var visible = allMatches
            .Where(x => x.IsVisible)
            .Select(x =>
                new PhoneMatchDto(
                    x.Id,
                    x.PatientCode,
                    x.FullName,
                    x.PhoneNumber,
                    x.IsBlacklisted))
            .ToArray();

        return new PhoneCheckDto(
            allMatches.Count > 0,
            allMatches.Any(
                x => !x.IsVisible),
            visible);
    }

    public async Task<PatientWriteResult> CreateAsync(
        CreatePatientCommand command,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var fullName =
            command.FullName.Trim();

        var normalizedName =
            TextNormalizer.NormalizeName(
                fullName);

        var phone =
            command.PhoneNumber.Trim();

        var normalizedPhone =
            TextNormalizer.NormalizePhone(
                phone);

        var formNumber =
            string.IsNullOrWhiteSpace(
                command.FormNumber)
            ? null
            : command.FormNumber.Trim();

        if (normalizedPhone.Length < 7)
        {
            return new PatientWriteResult(
                false,
                "INVALID_PHONE",
                "Phone number is invalid.",
                null);
        }

        if (
            command.DateOfBirth
                is not null
            && command.DateOfBirth.Value
                > DateOnly.FromDateTime(
                    DateTime.UtcNow)
        )
        {
            return new PatientWriteResult(
                false,
                "INVALID_DATE_OF_BIRTH",
                "Date of birth cannot be in the future.",
                null);
        }

        if (command.DoctorIds.Count == 0)
        {
            return new PatientWriteResult(
                false,
                "DOCTOR_REQUIRED",
                "Select at least one doctor.",
                null);
        }

        if (
            formNumber is not null
            && await _db.Patients
                .AnyAsync(
                    x =>
                        x.FormNumber
                        == formNumber,
                    cancellationToken)
        )
        {
            return new PatientWriteResult(
                false,
                "FORM_NUMBER_EXISTS",
                "Form number already exists.",
                null);
        }

        var likelyDuplicate =
            await _db.Patients.AnyAsync(
                x =>
                    x.NormalizedPhone
                    == normalizedPhone
                    && x.NormalizedFullName
                    == normalizedName,
                cancellationToken);

        if (likelyDuplicate)
        {
            return new PatientWriteResult(
                false,
                "POTENTIAL_DUPLICATE",
                "A patient with the same name and phone already exists.",
                null);
        }

        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            PatientCode =
                GeneratePatientCode(),
            FormNumber = formNumber,
            FullName = fullName,
            NormalizedFullName =
                normalizedName,
            PhoneNumber = phone,
            NormalizedPhone =
                normalizedPhone,
            DateOfBirth =
                command.DateOfBirth,
            Gender =
                CleanOptional(
                    command.Gender),
            Address =
                CleanOptional(
                    command.Address),
            AdministrativeNotes =
                CleanOptional(
                    command.AdministrativeNotes),
            ProfileStatus =
                command.DateOfBirth
                is null
                    ? PatientProfileStatus
                        .PreRegistered
                    : PatientProfileStatus
                        .BasicCompleted,
            CreatedAtUtc =
                DateTime.UtcNow,
            UpdatedAtUtc =
                DateTime.UtcNow
        };

        foreach (
            var doctorId
            in command.DoctorIds
                .Distinct()
        )
        {
            patient.DoctorAssignments.Add(
                new PatientDoctorAssignment
                {
                    PatientId =
                        patient.Id,
                    DoctorId =
                        doctorId,
                    AssignedByUserId =
                        actorUserId,
                    AssignedAtUtc =
                        DateTime.UtcNow
                });
        }

        _db.Patients.Add(patient);

        _audit.Add(
            actorUserId,
            "PatientCreated",
            nameof(Patient),
            patient.Id.ToString(),
            null,
            new
            {
                patient.PatientCode,
                patient.FormNumber,
                patient.FullName,
                patient.PhoneNumber,
                patient.DateOfBirth,
                DoctorIds =
                    command.DoctorIds
                    .Distinct()
                    .ToArray()
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return new PatientWriteResult(
            true,
            null,
            null,
            patient.Id);
    }

    public async Task<PatientWriteResult> UpdateAsync(
        Guid patientId,
        UpdatePatientCommand command,
        IReadOnlyCollection<Guid> allowedDoctorIds,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var patient =
            await _db.Patients
            .Include(
                x =>
                    x.DoctorAssignments)
            .SingleOrDefaultAsync(
                x =>
                    x.Id == patientId
                    && x.DoctorAssignments
                        .Any(
                            a =>
                                allowedDoctorIds
                                .Contains(
                                    a.DoctorId)),
                cancellationToken);

        if (patient is null)
        {
            return new PatientWriteResult(
                false,
                "NOT_FOUND",
                "Patient was not found.",
                null);
        }

        var formNumber =
            string.IsNullOrWhiteSpace(
                command.FormNumber)
            ? null
            : command.FormNumber.Trim();

        if (
            formNumber is not null
            && await _db.Patients
                .AnyAsync(
                    x =>
                        x.Id != patientId
                        && x.FormNumber
                        == formNumber,
                    cancellationToken)
        )
        {
            return new PatientWriteResult(
                false,
                "FORM_NUMBER_EXISTS",
                "Form number already exists.",
                null);
        }

        var normalizedPhone =
            TextNormalizer.NormalizePhone(
                command.PhoneNumber);

        if (normalizedPhone.Length < 7)
        {
            return new PatientWriteResult(
                false,
                "INVALID_PHONE",
                "Phone number is invalid.",
                null);
        }

        if (
            command.DateOfBirth
                is not null
            && command.DateOfBirth.Value
                > DateOnly.FromDateTime(
                    DateTime.UtcNow)
        )
        {
            return new PatientWriteResult(
                false,
                "INVALID_DATE_OF_BIRTH",
                "Date of birth cannot be in the future.",
                null);
        }

        var oldValues = new
        {
            patient.FormNumber,
            patient.FullName,
            patient.PhoneNumber,
            patient.DateOfBirth,
            patient.Gender,
            patient.Address,
            patient.AdministrativeNotes,
            patient.ProfileStatus,
            DoctorIds =
                patient.DoctorAssignments
                .Select(
                    x => x.DoctorId)
                .Order()
                .ToArray()
        };

        patient.FormNumber =
            formNumber;

        patient.FullName =
            command.FullName.Trim();

        patient.NormalizedFullName =
            TextNormalizer.NormalizeName(
                command.FullName);

        patient.PhoneNumber =
            command.PhoneNumber.Trim();

        patient.NormalizedPhone =
            normalizedPhone;

        patient.DateOfBirth =
            command.DateOfBirth;

        patient.Gender =
            CleanOptional(
                command.Gender);

        patient.Address =
            CleanOptional(
                command.Address);

        patient.AdministrativeNotes =
            CleanOptional(
                command.AdministrativeNotes);

        patient.ProfileStatus =
            command.MarkBasicCompleted
                ? PatientProfileStatus
                    .BasicCompleted
                : patient.ProfileStatus;

        patient.UpdatedAtUtc =
            DateTime.UtcNow;

        var requestedIds =
            command.DoctorIds
            .Distinct()
            .ToHashSet();

        var removable =
            patient.DoctorAssignments
            .Where(
                x =>
                    allowedDoctorIds
                    .Contains(
                        x.DoctorId)
                    && !requestedIds
                    .Contains(
                        x.DoctorId))
            .ToArray();

        _db.PatientDoctorAssignments
            .RemoveRange(removable);

        var currentIds =
            patient.DoctorAssignments
            .Select(
                x => x.DoctorId)
            .ToHashSet();

        foreach (
            var doctorId
            in requestedIds.Where(
                x =>
                    !currentIds
                    .Contains(x))
        )
        {
            patient.DoctorAssignments.Add(
                new PatientDoctorAssignment
                {
                    PatientId =
                        patient.Id,
                    DoctorId =
                        doctorId,
                    AssignedByUserId =
                        actorUserId,
                    AssignedAtUtc =
                        DateTime.UtcNow
                });
        }

        var newValues = new
        {
            patient.FormNumber,
            patient.FullName,
            patient.PhoneNumber,
            patient.DateOfBirth,
            patient.Gender,
            patient.Address,
            patient.AdministrativeNotes,
            patient.ProfileStatus,
            DoctorIds =
                requestedIds
                .Order()
                .ToArray()
        };

        _audit.Add(
            actorUserId,
            "PatientUpdated",
            nameof(Patient),
            patient.Id.ToString(),
            oldValues,
            newValues,
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return new PatientWriteResult(
            true,
            null,
            null,
            patient.Id);
    }

    private async Task<
        Dictionary<
            Guid,
            IReadOnlyCollection<
                PatientDoctorDto>>>
        GetDoctorsForPatientsAsync(
            IReadOnlyCollection<Guid> patientIds,
            IReadOnlyCollection<Guid> allowedDoctorIds,
            CancellationToken cancellationToken)
    {
        if (
            patientIds.Count == 0
            || allowedDoctorIds.Count == 0
        )
        {
            return [];
        }

        var rows = await (
            from assignment
                in _db
                .PatientDoctorAssignments
                .AsNoTracking()
            join doctor
                in _db.Doctors
                .AsNoTracking()
                on assignment.DoctorId
                equals doctor.Id
            join user
                in _db.Users
                .AsNoTracking()
                on doctor.UserId
                equals user.Id
            where patientIds.Contains(
                assignment.PatientId)
                && allowedDoctorIds.Contains(
                    doctor.Id)
            select new
            {
                assignment.PatientId,
                DoctorId = doctor.Id,
                user.FullName
            })
            .ToListAsync(
                cancellationToken);

        return rows
            .GroupBy(
                x => x.PatientId)
            .ToDictionary(
                group => group.Key,
                group =>
                    (IReadOnlyCollection<
                        PatientDoctorDto>)
                    group.Select(
                        x =>
                            new PatientDoctorDto(
                                x.DoctorId,
                                x.FullName))
                    .ToArray());
    }

    private static string GeneratePatientCode()
    {
        return
            $"BD-{DateTime.UtcNow:yyyy}-{RandomNumberGenerator.GetHexString(10)}";
    }

    private static string? CleanOptional(
        string? value)
    {
        return string.IsNullOrWhiteSpace(
            value)
            ? null
            : value.Trim();
    }
}
