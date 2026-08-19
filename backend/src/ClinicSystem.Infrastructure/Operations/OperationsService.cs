using ClinicSystem.Domain.Enums;
using ClinicSystem.Infrastructure.Audit;
using ClinicSystem.Infrastructure.Finance;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.Operations;

public sealed class OperationsService
{
    private readonly ClinicDbContext _db;
    private readonly AuditService _audit;
    private readonly AccountingPeriodGuard _periodGuard;

    public OperationsService(
        ClinicDbContext db,
        AuditService audit,
        AccountingPeriodGuard periodGuard)
    {
        _db = db;
        _audit = audit;
        _periodGuard = periodGuard;
    }

    public async Task<IReadOnlyCollection<VisitBrowseItemDto>>
        GetRecentVisitsAsync(
            IReadOnlyCollection<Guid> allowedDoctorIds,
            string? search,
            DateTime? fromUtc,
            DateTime? toUtc,
            int take,
            CancellationToken cancellationToken)
    {
        if (allowedDoctorIds.Count == 0)
        {
            return [];
        }

        take = Math.Clamp(take, 10, 300);

        var query =
            _db.PatientVisits
            .AsNoTracking()
            .Where(
                visit =>
                    !visit.IsVoided
                    && allowedDoctorIds
                    .Contains(visit.DoctorId));

        if (fromUtc is not null)
        {
            query =
                query.Where(
                    x =>
                        x.VisitDateUtc
                        >= fromUtc.Value);
        }

        if (toUtc is not null)
        {
            query =
                query.Where(
                    x =>
                        x.VisitDateUtc
                        < toUtc.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            var phoneDigits =
                new string(
                    term.Where(char.IsDigit)
                        .ToArray());

            query =
                query.Where(
                    x =>
                        x.Patient.PatientCode
                        == term
                        || x.Patient.FormNumber
                        == term
                        || EF.Functions.ILike(
                            x.Patient.FullName,
                            $"%{term}%")
                        || (
                            phoneDigits.Length >= 3
                            && x.Patient.NormalizedPhone
                                .Contains(phoneDigits)
                        ));
        }

        var rows =
            await query
            .Include(x => x.TreatmentItems)
                .ThenInclude(x => x.Teeth)
            .Include(x => x.Payments)
            .Include(x => x.Patient)
            .Include(x => x.Doctor)
            .OrderByDescending(
                x => x.VisitDateUtc)
            .Take(take)
            .ToListAsync(
                cancellationToken);

        if (rows.Count == 0)
        {
            return [];
        }

        var doctorUserIds =
            rows
            .Select(x => x.Doctor.UserId)
            .Distinct()
            .ToArray();

        var doctorNames =
            await _db.Users
            .AsNoTracking()
            .Where(
                x =>
                    doctorUserIds
                    .Contains(x.Id))
            .ToDictionaryAsync(
                x => x.Id,
                x => x.FullName,
                cancellationToken);

        return rows
            .Select(
                visit =>
                {
                    var subtotal =
                        visit.TreatmentItems
                        .Sum(
                            x =>
                                x.UnitPriceSnapshot
                                * x.Quantity);

                    var total =
                        subtotal
                        - visit.DiscountAmount
                        + visit.ExtraAmount;

                    var paid =
                        visit.Payments
                        .Sum(x => x.Amount);

                    var treatmentSummary =
                        string.Join(
                            " • ",
                            visit.TreatmentItems
                            .Select(
                                x =>
                                    x.ServiceNameArSnapshot));

                    var teethSummary =
                        string.Join(
                            " • ",
                            visit.TreatmentItems
                            .SelectMany(x => x.Teeth)
                            .Select(
                                x =>
                                    x.ToothFdiNumber)
                            .Distinct()
                            .Order());

                    return new VisitBrowseItemDto(
                        visit.Id,
                        visit.PatientId,
                        visit.Patient.PatientCode,
                        visit.Patient.FullName,
                        visit.Patient.PhoneNumber,
                        visit.DoctorId,
                        doctorNames[
                            visit.Doctor.UserId],
                        visit.VisitDateUtc,
                        treatmentSummary,
                        teethSummary,
                        total,
                        paid,
                        Math.Max(
                            0,
                            total - paid),
                        visit.FollowUpAtUtc);
                })
            .ToArray();
    }

    public async Task<OperationResult>
        RemovePatientFromBlacklistAsync(
            Guid patientId,
            IReadOnlyCollection<Guid> allowedDoctorIds,
            Guid actorUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        var patient =
            await _db.Patients
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
            return Fail(
                "NOT_FOUND",
                "Patient was not found.");
        }

        var old =
            new
            {
                patient.IsBlacklisted,
                patient.NoShowCount,
                patient.BlacklistedAtUtc,
                patient.BlacklistClearedAtUtc
            };

        patient.IsBlacklisted = false;
        patient.NoShowCount = 0;
        patient.BlacklistedAtUtc = null;
        patient.BlacklistClearedAtUtc =
            DateTime.UtcNow;
        patient.UpdatedAtUtc =
            DateTime.UtcNow;

        _audit.Add(
            actorUserId,
            "PatientRemovedFromBlacklist",
            "Patient",
            patient.Id.ToString(),
            old,
            new
            {
                patient.IsBlacklisted,
                patient.NoShowCount,
                patient.BlacklistClearedAtUtc
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return Success();
    }


    public async Task<OperationResult>
        ArchivePatientAsync(
            Guid patientId,
            Guid actorUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        var patient =
            await _db.Patients
            .SingleOrDefaultAsync(
                x =>
                    x.Id == patientId,
                cancellationToken);

        if (patient is null)
        {
            return Fail(
                "NOT_FOUND",
                "Patient was not found.");
        }

        if (patient.IsArchived)
        {
            return Success();
        }

        var old =
            new
            {
                patient.IsArchived,
                patient.ArchivedAtUtc,
                patient.ArchivedByUserId
            };

        patient.IsArchived = true;
        patient.ArchivedAtUtc =
            DateTime.UtcNow;
        patient.ArchivedByUserId =
            actorUserId;
        patient.UpdatedAtUtc =
            DateTime.UtcNow;

        _audit.Add(
            actorUserId,
            "PatientArchived",
            "Patient",
            patient.Id.ToString(),
            old,
            new
            {
                patient.IsArchived,
                patient.ArchivedAtUtc,
                patient.ArchivedByUserId
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return Success();
    }

    public async Task<OperationResult>
        RescheduleAppointmentAsync(
            Guid appointmentId,
            RescheduleAppointmentCommand command,
            IReadOnlyCollection<Guid> allowedDoctorIds,
            Guid actorUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        var appointment =
            await _db.Appointments
            .SingleOrDefaultAsync(
                x =>
                    x.Id == appointmentId
                    && allowedDoctorIds
                        .Contains(x.DoctorId),
                cancellationToken);

        if (appointment is null)
        {
            return Fail(
                "NOT_FOUND",
                "Appointment was not found.");
        }

        var duration =
            Math.Clamp(
                command.DurationMinutes,
                5,
                240);

        var newEnd =
            command.ScheduledAtUtc
            .AddMinutes(duration);

        var collision =
            await _db.Appointments
            .AsNoTracking()
            .AnyAsync(
                x =>
                    x.Id != appointmentId
                    && x.DoctorId
                        == appointment.DoctorId
                    && x.AttendanceStatus
                        != AppointmentAttendanceStatus.Cancelled
                    && x.ScheduledAtUtc < newEnd
                    && x.ScheduledAtUtc
                        .AddMinutes(
                            x.DurationMinutes)
                        > command.ScheduledAtUtc,
                cancellationToken);

        if (collision)
        {
            return Fail(
                "DOCTOR_TIME_COLLISION",
                "Doctor already has an appointment in this time range.");
        }

        var old =
            new
            {
                appointment.ScheduledAtUtc,
                appointment.DurationMinutes,
                appointment.Notes
            };

        appointment.ScheduledAtUtc =
            command.ScheduledAtUtc;

        appointment.DurationMinutes =
            duration;

        if (!string.IsNullOrWhiteSpace(
            command.Notes))
        {
            appointment.Notes =
                command.Notes.Trim();
        }

        appointment.UpdatedAtUtc =
            DateTime.UtcNow;

        _audit.Add(
            actorUserId,
            "AppointmentRescheduled",
            "Appointment",
            appointment.Id.ToString(),
            old,
            new
            {
                appointment.ScheduledAtUtc,
                appointment.DurationMinutes,
                appointment.Notes
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return Success();
    }

    public async Task<OperationResult>
        DeletePaymentAsync(
            Guid visitId,
            Guid paymentId,
            IReadOnlyCollection<Guid> allowedDoctorIds,
            Guid actorUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        var payment =
            await _db.Payments
            .Include(x => x.Visit)
            .SingleOrDefaultAsync(
                x =>
                    x.Id == paymentId
                    && x.VisitId == visitId
                    && allowedDoctorIds
                        .Contains(x.DoctorId),
                cancellationToken);

        if (payment is null)
        {
            return Fail(
                "NOT_FOUND",
                "Payment was not found.");
        }

        if (
            !await _periodGuard.IsOpenAsync(
                payment.PaidAtUtc,
                cancellationToken)
        )
        {
            return Fail(
                "ACCOUNTING_PERIOD_CLOSED",
                "The accounting period for this payment is closed.");
        }

        var old =
            new
            {
                payment.Id,
                payment.VisitId,
                payment.DoctorId,
                payment.Amount,
                payment.Method,
                payment.Notes,
                payment.PaidAtUtc
            };

        _db.Payments.Remove(payment);

        _audit.Add(
            actorUserId,
            "PaymentDeleted",
            "Payment",
            payment.Id.ToString(),
            old,
            null,
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return Success();
    }

    private static OperationResult Success() =>
        new(
            true,
            null,
            null);

    private static OperationResult Fail(
        string code,
        string message) =>
        new(
            false,
            code,
            message);
}
