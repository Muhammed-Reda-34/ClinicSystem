using ClinicSystem.Domain.Entities;
using ClinicSystem.Domain.Enums;
using ClinicSystem.Infrastructure.Audit;
using ClinicSystem.Infrastructure.Common;
using ClinicSystem.Infrastructure.Patients;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.PreliminaryBookings;

public sealed class PreliminaryBookingService
{
    private readonly ClinicDbContext _db;
    private readonly AuditService _audit;
    private readonly PatientService _patients;

    public PreliminaryBookingService(
        ClinicDbContext db,
        AuditService audit,
        PatientService patients)
    {
        _db = db;
        _audit = audit;
        _patients = patients;
    }

    public async Task<IReadOnlyCollection<PreliminaryBookingDto>> GetAsync(
        DateOnly date,
        IReadOnlyCollection<Guid> allowedDoctorIds,
        CancellationToken cancellationToken)
    {
        if (allowedDoctorIds.Count == 0)
        {
            return [];
        }

        return await _db.PreliminaryBookings
            .AsNoTracking()
            .Where(x =>
                (x.VisitDate == date || x.VisitDate == null)
                && x.PatientId != null
                && x.Patient != null
                && !x.Patient.IsArchived
                && x.Patient.DoctorAssignments.Any(
                    assignment => allowedDoctorIds.Contains(assignment.DoctorId)))
            .OrderBy(x => x.VisitDate == null)
            .ThenBy(x => x.VisitTime == null)
            .ThenBy(x => x.VisitTime)
            .ThenByDescending(x => x.CreatedAtUtc)
            .Select(x => new PreliminaryBookingDto(
                x.Id,
                x.PatientId,
                x.Patient!.PatientCode,
                (int?)x.Patient.ProfileStatus,
                x.PatientName,
                x.PhoneNumber,
                x.VisitDate,
                x.VisitTime,
                x.AttendanceStatus,
                x.Patient.IsBlacklisted,
                x.Patient.NoShowCount,
                x.CreatedByUserId,
                x.CreatedAtUtc,
                x.UpdatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<PreliminaryBookingWriteResult> CreateAsync(
        CreatePreliminaryBookingCommand command,
        IReadOnlyCollection<Guid> allowedDoctorIds,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var name = command.PatientName?.Trim();

        if (string.IsNullOrWhiteSpace(name))
        {
            return Failure(
                "PATIENT_NAME_REQUIRED",
                "Patient name is required.");
        }

        if (name.Length > 250)
        {
            return Failure(
                "PATIENT_NAME_TOO_LONG",
                "Patient name is too long.");
        }

        var parsedPhone = PhoneNumberNormalizer.Parse(command.PhoneNumber);

        if (!parsedPhone.IsValid)
        {
            return Failure(
                parsedPhone.ErrorCode ?? "INVALID_PHONE",
                parsedPhone.ErrorMessage ?? "Phone number is invalid.");
        }

        var targetDoctorId = await ResolveDefaultDoctorIdAsync(
            allowedDoctorIds,
            cancellationToken);

        if (targetDoctorId == Guid.Empty)
        {
            return Failure(
                "DOCTOR_SCOPE_REQUIRED",
                "No doctor is available in the current scope.");
        }

        var (patient, wasExistingPatient) = await ResolvePatientAsync(
            name,
            command.PhoneNumber.Trim(),
            parsedPhone,
            targetDoctorId,
            actorUserId,
            ipAddress,
            cancellationToken);

        if (patient is null)
        {
            return Failure(
                "PATIENT_LINK_FAILED",
                "Could not create or link the patient record.");
        }

        var booking = new PreliminaryBooking
        {
            Id = Guid.NewGuid(),
            PatientId = patient.Id,
            PatientName = name,
            PhoneNumber = command.PhoneNumber.Trim(),
            VisitDate = command.VisitDate,
            VisitTime = command.VisitTime,
            AttendanceStatus = AppointmentAttendanceStatus.Scheduled,
            CreatedByUserId = actorUserId,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        _db.PreliminaryBookings.Add(booking);

        _audit.Add(
            actorUserId,
            "PreliminaryBookingCreated",
            nameof(PreliminaryBooking),
            booking.Id.ToString(),
            null,
            new
            {
                booking.PatientId,
                booking.PatientName,
                booking.PhoneNumber,
                booking.VisitDate,
                booking.VisitTime,
                WasExistingPatient = wasExistingPatient,
                patient.IsBlacklisted,
                patient.NoShowCount
            },
            ipAddress);

        await _db.SaveChangesAsync(cancellationToken);

        return new PreliminaryBookingWriteResult(
            true,
            null,
            null,
            booking.Id,
            patient.Id,
            wasExistingPatient,
            patient.IsBlacklisted,
            patient.NoShowCount);
    }

    public async Task<PreliminaryBookingWriteResult> SetStatusAsync(
        Guid bookingId,
        AppointmentAttendanceStatus status,
        IReadOnlyCollection<Guid> allowedDoctorIds,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        if (
            status != AppointmentAttendanceStatus.Attended
            && status != AppointmentAttendanceStatus.NoShow
            && status != AppointmentAttendanceStatus.Excused
        )
        {
            return Failure(
                "INVALID_ATTENDANCE_STATUS",
                "Only attended, no-show or excused are allowed.");
        }

        var booking = await _db.PreliminaryBookings
            .Include(x => x.Patient)
            .ThenInclude(x => x!.DoctorAssignments)
            .SingleOrDefaultAsync(
                x =>
                    x.Id == bookingId
                    && x.PatientId != null
                    && x.Patient != null
                    && x.Patient.DoctorAssignments.Any(
                        assignment => allowedDoctorIds.Contains(assignment.DoctorId)),
                cancellationToken);

        if (booking is null)
        {
            return Failure(
                "NOT_FOUND",
                "Preliminary booking was not found.");
        }

        var oldStatus = booking.AttendanceStatus;

        if (oldStatus != status)
        {
            booking.AttendanceStatus = status;
            booking.UpdatedAtUtc = DateTime.UtcNow;

            _audit.Add(
                actorUserId,
                "PreliminaryBookingAttendanceChanged",
                nameof(PreliminaryBooking),
                booking.Id.ToString(),
                new
                {
                    AttendanceStatus = oldStatus.ToString()
                },
                new
                {
                    AttendanceStatus = status.ToString()
                },
                ipAddress);
        }

        var patientState = await RecalculateComplianceAsync(
            booking.PatientId!.Value,
            actorUserId,
            ipAddress,
            cancellationToken);

        await _db.SaveChangesAsync(cancellationToken);

        return new PreliminaryBookingWriteResult(
            true,
            null,
            null,
            booking.Id,
            booking.PatientId,
            true,
            patientState.IsBlacklisted,
            patientState.NoShowCount);
    }

    public async Task ReconcileUnlinkedBookingsAsync(
        IReadOnlyCollection<Guid> allowedDoctorIds,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        if (allowedDoctorIds.Count == 0)
        {
            return;
        }

        var pending = await _db.PreliminaryBookings
            .Where(x => x.PatientId == null)
            .OrderBy(x => x.CreatedAtUtc)
            .Take(5000)
            .ToListAsync(cancellationToken);

        if (pending.Count == 0)
        {
            return;
        }

        var targetDoctorId = await ResolveDefaultDoctorIdAsync(
            allowedDoctorIds,
            cancellationToken);

        if (targetDoctorId == Guid.Empty)
        {
            return;
        }

        var affectedPatientIds = new HashSet<Guid>();

        foreach (var booking in pending)
        {
            var parsedPhone = PhoneNumberNormalizer.Parse(booking.PhoneNumber);

            if (!parsedPhone.IsValid)
            {
                continue;
            }

            var (patient, _) = await ResolvePatientAsync(
                booking.PatientName,
                booking.PhoneNumber,
                parsedPhone,
                targetDoctorId,
                actorUserId,
                ipAddress,
                cancellationToken);

            if (patient is null)
            {
                continue;
            }

            booking.PatientId = patient.Id;
            affectedPatientIds.Add(patient.Id);
        }

        await _db.SaveChangesAsync(cancellationToken);

        foreach (var patientId in affectedPatientIds)
        {
            await RecalculateComplianceAsync(
                patientId,
                actorUserId,
                ipAddress,
                cancellationToken);
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<(Patient? Patient, bool WasExisting)> ResolvePatientAsync(
        string patientName,
        string phoneNumber,
        PhoneNumberParseResult parsedPhone,
        Guid targetDoctorId,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var patient = await FindPatientByPhoneAsync(
            phoneNumber,
            parsedPhone,
            cancellationToken);

        if (patient is not null)
        {
            EnsureDoctorAssignment(patient, targetDoctorId, actorUserId);
            return (patient, true);
        }

        var createResult = await _patients.CreateAsync(
            new CreatePatientCommand(
                patientName,
                phoneNumber,
                null,
                null,
                null,
                null,
                null,
                [targetDoctorId]),
            actorUserId,
            ipAddress,
            cancellationToken);

        if (createResult.Succeeded && createResult.PatientId is not null)
        {
            patient = await _db.Patients
                .Include(x => x.DoctorAssignments)
                .SingleOrDefaultAsync(
                    x => x.Id == createResult.PatientId.Value,
                    cancellationToken);

            return (patient, false);
        }

        // Handles a race or an already existing duplicate gracefully.
        patient = await FindPatientByPhoneAsync(
            phoneNumber,
            parsedPhone,
            cancellationToken);

        if (patient is not null)
        {
            EnsureDoctorAssignment(patient, targetDoctorId, actorUserId);
            return (patient, true);
        }

        return (null, false);
    }

    private async Task<Patient?> FindPatientByPhoneAsync(
        string phoneNumber,
        PhoneNumberParseResult parsedPhone,
        CancellationToken cancellationToken)
    {
        var candidates = PhoneNumberNormalizer
            .GetCandidates(phoneNumber)
            .ToArray();

        return await _db.Patients
            .Include(x => x.DoctorAssignments)
            .Where(x =>
                !x.IsArchived
                && (
                    candidates.Contains(x.NormalizedPhone)
                    || (
                        parsedPhone.E164 != null
                        && x.PhoneE164 == parsedPhone.E164
                    )
                ))
            .OrderByDescending(x => x.UpdatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static void EnsureDoctorAssignment(
        Patient patient,
        Guid targetDoctorId,
        Guid actorUserId)
    {
        if (patient.DoctorAssignments.Any(x => x.DoctorId == targetDoctorId))
        {
            return;
        }

        patient.DoctorAssignments.Add(
            new PatientDoctorAssignment
            {
                PatientId = patient.Id,
                DoctorId = targetDoctorId,
                AssignedByUserId = actorUserId,
                AssignedAtUtc = DateTime.UtcNow
            });

        patient.UpdatedAtUtc = DateTime.UtcNow;
    }

    private async Task<Guid> ResolveDefaultDoctorIdAsync(
        IReadOnlyCollection<Guid> allowedDoctorIds,
        CancellationToken cancellationToken)
    {
        if (allowedDoctorIds.Count == 0)
        {
            return Guid.Empty;
        }

        return await _db.Doctors
            .AsNoTracking()
            .Where(x => allowedDoctorIds.Contains(x.Id))
            .OrderByDescending(x => x.IsOwner)
            .ThenBy(x => x.Id)
            .Select(x => x.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<(bool IsBlacklisted, int NoShowCount)> RecalculateComplianceAsync(
        Guid patientId,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var patient = await _db.Patients
            .SingleAsync(x => x.Id == patientId, cancellationToken);

        var clearedAtUtc = patient.BlacklistClearedAtUtc;

        var appointmentNoShows = await _db.Appointments
            .CountAsync(
                x =>
                    x.PatientId == patientId
                    && x.AttendanceStatus == AppointmentAttendanceStatus.NoShow
                    && (
                        clearedAtUtc == null
                        || x.UpdatedAtUtc > clearedAtUtc
                    ),
                cancellationToken);

        var preliminaryNoShows = await _db.PreliminaryBookings
            .CountAsync(
                x =>
                    x.PatientId == patientId
                    && x.AttendanceStatus == AppointmentAttendanceStatus.NoShow
                    && (
                        clearedAtUtc == null
                        || x.UpdatedAtUtc > clearedAtUtc
                    ),
                cancellationToken);

        var noShowCount = appointmentNoShows + preliminaryNoShows;
        var wasBlacklisted = patient.IsBlacklisted;
        var previousNoShowCount = patient.NoShowCount;

        patient.NoShowCount = noShowCount;
        patient.IsBlacklisted = noShowCount >= 2;
        patient.BlacklistedAtUtc = patient.IsBlacklisted
            ? patient.BlacklistedAtUtc ?? DateTime.UtcNow
            : null;
        patient.UpdatedAtUtc = DateTime.UtcNow;

        if (wasBlacklisted != patient.IsBlacklisted)
        {
            _audit.Add(
                actorUserId,
                patient.IsBlacklisted
                    ? "PatientAutoBlacklisted"
                    : "PatientAutoRemovedFromBlacklist",
                nameof(Patient),
                patient.Id.ToString(),
                new
                {
                    IsBlacklisted = wasBlacklisted,
                    PreviousNoShowCount = previousNoShowCount
                },
                new
                {
                    patient.IsBlacklisted,
                    patient.NoShowCount,
                    AppointmentNoShows = appointmentNoShows,
                    PreliminaryNoShows = preliminaryNoShows
                },
                ipAddress);
        }

        return (patient.IsBlacklisted, patient.NoShowCount);
    }

    private static PreliminaryBookingWriteResult Failure(
        string code,
        string message)
    {
        return new PreliminaryBookingWriteResult(
            false,
            code,
            message,
            null,
            null,
            false,
            false,
            0);
    }
}
