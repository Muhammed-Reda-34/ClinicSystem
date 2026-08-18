using ClinicSystem.Domain.Entities;
using ClinicSystem.Domain.Enums;
using ClinicSystem.Infrastructure.Audit;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.Appointments;

public sealed class AppointmentService
{
    private readonly ClinicDbContext _db;
    private readonly AuditService _audit;

    public AppointmentService(
        ClinicDbContext db,
        AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<IReadOnlyCollection<AppointmentListItemDto>> GetAsync(
        IReadOnlyCollection<Guid> allowedDoctorIds,
        DateTime fromUtc,
        DateTime toUtc,
        CancellationToken cancellationToken)
    {
        if (allowedDoctorIds.Count == 0)
        {
            return [];
        }

        return await (
            from appointment in _db.Appointments.AsNoTracking()
            join patient in _db.Patients.AsNoTracking()
                on appointment.PatientId equals patient.Id
            join doctor in _db.Doctors.AsNoTracking()
                on appointment.DoctorId equals doctor.Id
            join doctorUser in _db.Users.AsNoTracking()
                on doctor.UserId equals doctorUser.Id
            where allowedDoctorIds.Contains(appointment.DoctorId)
                  && appointment.ScheduledAtUtc >= fromUtc
                  && appointment.ScheduledAtUtc < toUtc
            orderby appointment.ScheduledAtUtc
            select new AppointmentListItemDto(
                appointment.Id,
                patient.Id,
                patient.PatientCode,
                patient.FullName,
                patient.PhoneNumber,
                patient.IsBlacklisted,
                patient.NoShowCount,
                doctor.Id,
                doctorUser.FullName,
                appointment.ScheduledAtUtc,
                appointment.DurationMinutes,
                appointment.AttendanceStatus,
                appointment.Reason,
                appointment.Notes))
            .ToListAsync(cancellationToken);
    }


    public async Task<IReadOnlyCollection<AppointmentListItemDto>>
        GetForPatientAsync(
            Guid patientId,
            IReadOnlyCollection<Guid> allowedDoctorIds,
            CancellationToken cancellationToken)
    {
        if (allowedDoctorIds.Count == 0)
        {
            return [];
        }

        return await (
            from appointment
                in _db.Appointments.AsNoTracking()
            join patient
                in _db.Patients.AsNoTracking()
                on appointment.PatientId
                equals patient.Id
            join doctor
                in _db.Doctors.AsNoTracking()
                on appointment.DoctorId
                equals doctor.Id
            join doctorUser
                in _db.Users.AsNoTracking()
                on doctor.UserId
                equals doctorUser.Id
            where
                appointment.PatientId
                == patientId
                && allowedDoctorIds
                    .Contains(
                        appointment.DoctorId)
            orderby
                appointment.ScheduledAtUtc
                descending
            select new AppointmentListItemDto(
                appointment.Id,
                patient.Id,
                patient.PatientCode,
                patient.FullName,
                patient.PhoneNumber,
                patient.IsBlacklisted,
                patient.NoShowCount,
                doctor.Id,
                doctorUser.FullName,
                appointment.ScheduledAtUtc,
                appointment.DurationMinutes,
                appointment.AttendanceStatus,
                appointment.Reason,
                appointment.Notes))
            .Take(100)
            .ToListAsync(
                cancellationToken);
    }

    public async Task<AppointmentWriteResult> CreateAsync(
        CreateAppointmentCommand command,
        IReadOnlyCollection<Guid> allowedDoctorIds,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        if (!allowedDoctorIds.Contains(command.DoctorId))
        {
            return new AppointmentWriteResult(
                false,
                "DOCTOR_SCOPE_DENIED",
                "Doctor scope is not allowed.",
                null);
        }

        var patient = await _db.Patients
            .AsNoTracking()
            .SingleOrDefaultAsync(
                p =>
                    p.Id == command.PatientId
                    && !p.IsArchived
                    && p.DoctorAssignments.Any(
                        assignment =>
                            assignment.DoctorId
                            == command.DoctorId),
                cancellationToken);

        if (patient is null)
        {
            return new AppointmentWriteResult(
                false,
                "PATIENT_NOT_FOUND",
                "Patient is not assigned to the selected doctor.",
                null);
        }

        if (
            patient.IsBlacklisted
            && !command.AllowBlacklisted
        )
        {
            return new AppointmentWriteResult(
                false,
                "BLACKLISTED_PATIENT",
                "Patient is on the non-compliance list.",
                null);
        }

        var duration = Math.Clamp(
            command.DurationMinutes,
            5,
            240);

        var appointmentEnd =
            command.ScheduledAtUtc.AddMinutes(duration);

        var hasCollision =
            await _db.Appointments.AnyAsync(
                a =>
                    a.DoctorId == command.DoctorId
                    && a.AttendanceStatus
                        != AppointmentAttendanceStatus.Cancelled
                    && a.ScheduledAtUtc < appointmentEnd
                    && a.ScheduledAtUtc
                        .AddMinutes(a.DurationMinutes)
                        > command.ScheduledAtUtc,
                cancellationToken);

        if (hasCollision)
        {
            return new AppointmentWriteResult(
                false,
                "DOCTOR_TIME_COLLISION",
                "The doctor already has an appointment in this time range.",
                null);
        }

        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            PatientId = command.PatientId,
            DoctorId = command.DoctorId,
            ScheduledAtUtc = command.ScheduledAtUtc,
            DurationMinutes = duration,
            AttendanceStatus =
                AppointmentAttendanceStatus.Scheduled,
            Reason = CleanOptional(command.Reason),
            Notes = CleanOptional(command.Notes),
            CreatedByUserId = actorUserId,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        _db.Appointments.Add(appointment);

        _audit.Add(
            actorUserId,
            "AppointmentCreated",
            nameof(Appointment),
            appointment.Id.ToString(),
            null,
            new
            {
                appointment.PatientId,
                appointment.DoctorId,
                appointment.ScheduledAtUtc,
                appointment.DurationMinutes,
                appointment.Reason,
                patient.IsBlacklisted
            },
            ipAddress);

        await _db.SaveChangesAsync(cancellationToken);

        return new AppointmentWriteResult(
            true,
            null,
            null,
            appointment.Id);
    }

    public async Task<AppointmentWriteResult> SetAttendanceAsync(
        Guid appointmentId,
        AppointmentAttendanceStatus status,
        IReadOnlyCollection<Guid> allowedDoctorIds,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var appointment = await _db.Appointments
            .SingleOrDefaultAsync(
                a =>
                    a.Id == appointmentId
                    && allowedDoctorIds.Contains(
                        a.DoctorId),
                cancellationToken);

        if (appointment is null)
        {
            return new AppointmentWriteResult(
                false,
                "NOT_FOUND",
                "Appointment was not found.",
                null);
        }

        var oldStatus = appointment.AttendanceStatus;

        if (oldStatus == status)
        {
            return new AppointmentWriteResult(
                true,
                null,
                null,
                appointment.Id);
        }

        appointment.AttendanceStatus = status;
        appointment.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        var patient = await _db.Patients
            .SingleAsync(
                x => x.Id == appointment.PatientId,
                cancellationToken);

        var noShowCount = await _db.Appointments
            .CountAsync(
                a =>
                    a.PatientId == appointment.PatientId
                    && a.AttendanceStatus
                        == AppointmentAttendanceStatus.NoShow
                    && (
                        patient.BlacklistClearedAtUtc == null
                        || a.UpdatedAtUtc > patient.BlacklistClearedAtUtc
                    ),
                cancellationToken);

        var wasBlacklisted = patient.IsBlacklisted;

        patient.NoShowCount = noShowCount;
        patient.IsBlacklisted = noShowCount >= 2;
        patient.BlacklistedAtUtc =
            patient.IsBlacklisted
                ? patient.BlacklistedAtUtc ?? DateTime.UtcNow
                : null;
        patient.UpdatedAtUtc = DateTime.UtcNow;

        _audit.Add(
            actorUserId,
            "AppointmentAttendanceChanged",
            nameof(Appointment),
            appointment.Id.ToString(),
            new
            {
                AttendanceStatus = oldStatus.ToString(),
                patient.NoShowCount,
                WasBlacklisted = wasBlacklisted
            },
            new
            {
                AttendanceStatus = status.ToString(),
                NoShowCount = noShowCount,
                IsBlacklisted = patient.IsBlacklisted
            },
            ipAddress);

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
                    IsBlacklisted = wasBlacklisted
                },
                new
                {
                    patient.IsBlacklisted,
                    patient.NoShowCount
                },
                ipAddress);
        }

        await _db.SaveChangesAsync(cancellationToken);

        return new AppointmentWriteResult(
            true,
            null,
            null,
            appointment.Id);
    }

    private static string? CleanOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
