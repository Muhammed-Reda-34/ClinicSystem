using ClinicSystem.Domain.Entities;
using ClinicSystem.Domain.Enums;
using ClinicSystem.Infrastructure.Audit;
using ClinicSystem.Infrastructure.Finance;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.Visits;

public sealed class VisitService
{
    private readonly ClinicDbContext _db;
    private readonly AuditService _audit;
    private readonly AccountingPeriodGuard _periodGuard;

    public VisitService(
        ClinicDbContext db,
        AuditService audit,
        AccountingPeriodGuard periodGuard)
    {
        _db = db;
        _audit = audit;
        _periodGuard = periodGuard;
    }

    public async Task<VisitWriteResult> CreateAsync(
        CreateVisitCommand command,
        IReadOnlyCollection<Guid> allowedDoctorIds,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        if (!allowedDoctorIds.Contains(command.DoctorId))
        {
            return Fail(
                "DOCTOR_SCOPE_DENIED",
                "Doctor scope is not allowed.");
        }

        if (
            !await _periodGuard.IsOpenAsync(
                command.VisitDateUtc,
                cancellationToken)
        )
        {
            return Fail(
                "ACCOUNTING_PERIOD_CLOSED",
                "The accounting period for this visit is closed.");
        }

        if (command.Treatments.Count == 0)
        {
            return Fail(
                "TREATMENT_REQUIRED",
                "Add at least one treatment.");
        }

        if (
            command.DiscountAmount < 0
            || command.ExtraAmount < 0
            || command.InitialPayment < 0
        )
        {
            return Fail(
                "INVALID_AMOUNT",
                "Amounts cannot be negative.");
        }

        var patientExists = await _db.Patients
            .AsNoTracking()
            .AnyAsync(
                p =>
                    p.Id == command.PatientId
                    && !p.IsArchived
                    && p.DoctorAssignments.Any(
                        a => a.DoctorId == command.DoctorId),
                cancellationToken);

        if (!patientExists)
        {
            return Fail(
                "PATIENT_NOT_FOUND",
                "Patient is not assigned to the selected doctor.");
        }

        if (command.AppointmentId is not null)
        {
            var appointmentValid = await _db.Appointments
                .AsNoTracking()
                .AnyAsync(
                    a =>
                        a.Id == command.AppointmentId.Value
                        && a.PatientId == command.PatientId
                        && a.DoctorId == command.DoctorId,
                    cancellationToken);

            if (!appointmentValid)
            {
                return Fail(
                    "INVALID_APPOINTMENT",
                    "Appointment does not match this patient and doctor.");
            }
        }

        var serviceIds = command.Treatments
            .Select(x => x.DentalServiceId)
            .Distinct()
            .ToArray();

        var services = await _db.DentalServices
            .Where(x =>
                serviceIds.Contains(x.Id)
                && x.IsActive)
            .ToDictionaryAsync(
                x => x.Id,
                cancellationToken);

        if (services.Count != serviceIds.Length)
        {
            return Fail(
                "INVALID_SERVICE",
                "One or more services are unavailable.");
        }

        foreach (var treatment in command.Treatments)
        {
            if (treatment.Quantity < 1 || treatment.Quantity > 100)
            {
                return Fail(
                    "INVALID_QUANTITY",
                    "Treatment quantity is invalid.");
            }

            if (treatment.ToothNumbers.Any(x => !IsValidFdiTooth(x)))
            {
                return Fail(
                    "INVALID_TOOTH",
                    "One or more tooth numbers are invalid.");
            }
        }

        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                cancellationToken);

        var visit = new PatientVisit
        {
            Id = Guid.NewGuid(),
            PatientId = command.PatientId,
            DoctorId = command.DoctorId,
            AppointmentId = command.AppointmentId,
            VisitDateUtc = command.VisitDateUtc,
            ClinicalNotes = CleanOptional(command.ClinicalNotes),
            DiscountAmount = command.DiscountAmount,
            ExtraAmount = command.ExtraAmount,
            ExtraReason = command.ExtraAmount > 0
                ? CleanOptional(command.ExtraReason)
                : null,
            FollowUpAtUtc = command.FollowUpAtUtc,
            CreatedByUserId = actorUserId,
            CreatedAtUtc = DateTime.UtcNow
        };

        decimal subtotal = 0;

        foreach (var commandItem in command.Treatments)
        {
            var service = services[commandItem.DentalServiceId];

            var item = new VisitTreatmentItem
            {
                Id = Guid.NewGuid(),
                VisitId = visit.Id,
                DentalServiceId = service.Id,
                ServiceNameArSnapshot = service.NameAr,
                ServiceNameEnSnapshot = service.NameEn,
                UnitPriceSnapshot = service.CurrentPrice,
                Quantity = commandItem.Quantity,
                Notes = CleanOptional(commandItem.Notes)
            };

            foreach (var tooth in commandItem.ToothNumbers.Distinct())
            {
                item.Teeth.Add(
                    new VisitTreatmentTooth
                    {
                        VisitTreatmentItemId = item.Id,
                        ToothFdiNumber = tooth
                    });
            }

            subtotal += service.CurrentPrice * commandItem.Quantity;
            visit.TreatmentItems.Add(item);
        }

        var total =
            subtotal
            - command.DiscountAmount
            + command.ExtraAmount;

        if (total < 0)
        {
            return Fail(
                "INVALID_TOTAL",
                "Discount cannot make the visit total negative.");
        }

        if (command.InitialPayment > total)
        {
            return Fail(
                "PAYMENT_EXCEEDS_TOTAL",
                "Initial payment cannot exceed the visit total.");
        }

        if (command.InitialPayment > 0)
        {
            visit.Payments.Add(
                new Payment
                {
                    Id = Guid.NewGuid(),
                    VisitId = visit.Id,
                    DoctorId = visit.DoctorId,
                    Amount = command.InitialPayment,
                    Method = CleanOptional(command.PaymentMethod),
                    PaidAtUtc = command.VisitDateUtc,
                    CreatedByUserId = actorUserId,
                    CreatedAtUtc = DateTime.UtcNow
                });
        }

        _db.PatientVisits.Add(visit);

        if (command.AppointmentId is not null)
        {
            var appointment = await _db.Appointments
                .SingleAsync(
                    x => x.Id == command.AppointmentId.Value,
                    cancellationToken);

            appointment.AttendanceStatus =
                AppointmentAttendanceStatus.Attended;
            appointment.UpdatedAtUtc = DateTime.UtcNow;
        }

        _audit.Add(
            actorUserId,
            "PatientVisitCreated",
            nameof(PatientVisit),
            visit.Id.ToString(),
            null,
            new
            {
                visit.PatientId,
                visit.DoctorId,
                visit.VisitDateUtc,
                Treatments = visit.TreatmentItems.Select(
                    x => new
                    {
                        x.DentalServiceId,
                        x.ServiceNameArSnapshot,
                        x.UnitPriceSnapshot,
                        x.Quantity,
                        Teeth = x.Teeth.Select(t => t.ToothFdiNumber)
                    }),
                Subtotal = subtotal,
                visit.DiscountAmount,
                visit.ExtraAmount,
                Total = total,
                InitialPayment = command.InitialPayment,
                visit.FollowUpAtUtc
            },
            ipAddress);

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new VisitWriteResult(
            true,
            null,
            null,
            visit.Id);
    }

    public async Task<IReadOnlyCollection<PatientVisitDto>>
        GetPatientVisitsAsync(
            Guid patientId,
            IReadOnlyCollection<Guid> allowedDoctorIds,
            CancellationToken cancellationToken)
    {
        if (allowedDoctorIds.Count == 0)
        {
            return [];
        }

        var visits = await _db.PatientVisits
            .AsNoTracking()
            .Where(v =>
                v.PatientId == patientId
                && allowedDoctorIds.Contains(v.DoctorId))
            .Include(v => v.TreatmentItems)
                .ThenInclude(x => x.Teeth)
            .Include(v => v.Payments)
            .OrderByDescending(v => v.VisitDateUtc)
            .ToListAsync(cancellationToken);

        if (visits.Count == 0)
        {
            return [];
        }

        var patient = await _db.Patients
            .AsNoTracking()
            .SingleAsync(x => x.Id == patientId, cancellationToken);

        var doctorIds = visits
            .Select(x => x.DoctorId)
            .Distinct()
            .ToArray();

        var doctorNames = await (
            from doctor in _db.Doctors.AsNoTracking()
            join user in _db.Users.AsNoTracking()
                on doctor.UserId equals user.Id
            where doctorIds.Contains(doctor.Id)
            select new
            {
                doctor.Id,
                user.FullName
            })
            .ToDictionaryAsync(
                x => x.Id,
                x => x.FullName,
                cancellationToken);

        return visits
            .Select(v => MapVisit(
                v,
                patient.PatientCode,
                patient.FullName,
                doctorNames[v.DoctorId]))
            .ToArray();
    }


    public async Task<IReadOnlyCollection<FollowUpVisitDto>>
        GetFollowUpsAsync(
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
            from visit in _db.PatientVisits.AsNoTracking()
            join patient in _db.Patients.AsNoTracking()
                on visit.PatientId equals patient.Id
            join doctor in _db.Doctors.AsNoTracking()
                on visit.DoctorId equals doctor.Id
            join doctorUser in _db.Users.AsNoTracking()
                on doctor.UserId equals doctorUser.Id
            where allowedDoctorIds.Contains(visit.DoctorId)
                  && visit.FollowUpAtUtc != null
                  && visit.FollowUpAtUtc >= fromUtc
                  && visit.FollowUpAtUtc < toUtc
            orderby visit.FollowUpAtUtc
            select new FollowUpVisitDto(
                visit.Id,
                patient.Id,
                patient.PatientCode,
                patient.FullName,
                patient.PhoneNumber,
                doctor.Id,
                doctorUser.FullName,
                visit.FollowUpAtUtc!.Value,
                visit.VisitDateUtc,
                visit.FollowUpCompletedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<DebtVisitDto>> GetDebtsAsync(
        IReadOnlyCollection<Guid> allowedDoctorIds,
        CancellationToken cancellationToken)
    {
        if (allowedDoctorIds.Count == 0)
        {
            return [];
        }

        var rows = await _db.PatientVisits
            .AsNoTracking()
            .Where(v => allowedDoctorIds.Contains(v.DoctorId))
            .Select(v => new
            {
                Visit = v,
                Patient = v.Patient,
                Doctor = v.Doctor,
                DoctorUserId = v.Doctor.UserId,
                Subtotal = v.TreatmentItems
                    .Sum(x => x.UnitPriceSnapshot * x.Quantity),
                Paid = v.Payments.Sum(x => x.Amount)
            })
            .ToListAsync(cancellationToken);

        var doctorUserIds = rows
            .Select(x => x.DoctorUserId)
            .Distinct()
            .ToArray();

        var doctorNames = await _db.Users
            .AsNoTracking()
            .Where(x => doctorUserIds.Contains(x.Id))
            .ToDictionaryAsync(
                x => x.Id,
                x => x.FullName,
                cancellationToken);

        return rows
            .Select(row =>
            {
                var total =
                    row.Subtotal
                    - row.Visit.DiscountAmount
                    + row.Visit.ExtraAmount;

                var remaining = total - row.Paid;

                return new
                {
                    row,
                    total,
                    remaining
                };
            })
            .Where(x => x.remaining > 0)
            .OrderByDescending(x => x.row.Visit.VisitDateUtc)
            .Select(x => new DebtVisitDto(
                x.row.Visit.Id,
                x.row.Patient.Id,
                x.row.Patient.PatientCode,
                x.row.Patient.FullName,
                x.row.Patient.PhoneNumber,
                x.row.Doctor.Id,
                doctorNames[x.row.DoctorUserId],
                x.row.Visit.VisitDateUtc,
                x.total,
                x.row.Paid,
                x.remaining))
            .ToArray();
    }

    public async Task<VisitWriteResult> AddPaymentAsync(
        Guid visitId,
        decimal amount,
        string? method,
        string? notes,
        IReadOnlyCollection<Guid> allowedDoctorIds,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        if (amount <= 0)
        {
            return Fail(
                "INVALID_AMOUNT",
                "Payment amount must be greater than zero.");
        }

        var paymentDateUtc = DateTime.UtcNow;

        if (
            !await _periodGuard.IsOpenAsync(
                paymentDateUtc,
                cancellationToken)
        )
        {
            return Fail(
                "ACCOUNTING_PERIOD_CLOSED",
                "The current accounting period is closed.");
        }

        var visit = await _db.PatientVisits
            .Include(x => x.TreatmentItems)
            .Include(x => x.Payments)
            .SingleOrDefaultAsync(
                v =>
                    v.Id == visitId
                    && allowedDoctorIds.Contains(v.DoctorId),
                cancellationToken);

        if (visit is null)
        {
            return Fail(
                "NOT_FOUND",
                "Visit was not found.");
        }

        var subtotal =
            visit.TreatmentItems.Sum(
                x => x.UnitPriceSnapshot * x.Quantity);

        var total =
            subtotal
            - visit.DiscountAmount
            + visit.ExtraAmount;

        var paid =
            visit.Payments.Sum(x => x.Amount);

        var remaining = total - paid;

        if (amount > remaining)
        {
            return Fail(
                "PAYMENT_EXCEEDS_REMAINING",
                "Payment exceeds the remaining balance.");
        }

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            VisitId = visit.Id,
            DoctorId = visit.DoctorId,
            Amount = amount,
            Method = CleanOptional(method),
            Notes = CleanOptional(notes),
            PaidAtUtc = paymentDateUtc,
            CreatedByUserId = actorUserId,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.Payments.Add(payment);

        _audit.Add(
            actorUserId,
            "PaymentAdded",
            nameof(Payment),
            payment.Id.ToString(),
            null,
            new
            {
                payment.VisitId,
                payment.DoctorId,
                payment.Amount,
                payment.Method,
                RemainingBefore = remaining,
                RemainingAfter = remaining - amount
            },
            ipAddress);

        await _db.SaveChangesAsync(cancellationToken);

        return new VisitWriteResult(
            true,
            null,
            null,
            visit.Id);
    }


    public async Task<VisitWriteResult>
        MarkFollowUpCompletedAsync(
            Guid visitId,
            IReadOnlyCollection<Guid> allowedDoctorIds,
            Guid actorUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        var visit =
            await _db.PatientVisits
            .SingleOrDefaultAsync(
                x =>
                    x.Id == visitId
                    && allowedDoctorIds
                        .Contains(x.DoctorId)
                    && x.FollowUpAtUtc != null,
                cancellationToken);

        if (visit is null)
        {
            return Fail(
                "NOT_FOUND",
                "Follow-up visit was not found.");
        }

        if (visit.FollowUpCompletedAtUtc is not null)
        {
            return new VisitWriteResult(
                true,
                null,
                null,
                visit.Id);
        }

        visit.FollowUpCompletedAtUtc =
            DateTime.UtcNow;
        visit.FollowUpCompletedByUserId =
            actorUserId;

        _audit.Add(
            actorUserId,
            "FollowUpCompleted",
            nameof(PatientVisit),
            visit.Id.ToString(),
            new
            {
                visit.FollowUpAtUtc,
                FollowUpCompletedAtUtc =
                    (DateTime?)null
            },
            new
            {
                visit.FollowUpAtUtc,
                visit.FollowUpCompletedAtUtc,
                visit.FollowUpCompletedByUserId
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return new VisitWriteResult(
            true,
            null,
            null,
            visit.Id);
    }

    private static PatientVisitDto MapVisit(
        PatientVisit visit,
        string patientCode,
        string patientName,
        string doctorName)
    {
        var treatments = visit.TreatmentItems
            .Select(item => new VisitTreatmentDto(
                item.Id,
                item.DentalServiceId,
                item.ServiceNameArSnapshot,
                item.ServiceNameEnSnapshot,
                item.UnitPriceSnapshot,
                item.Quantity,
                item.Teeth
                    .Select(x => x.ToothFdiNumber)
                    .Order()
                    .ToArray(),
                item.Notes,
                item.UnitPriceSnapshot * item.Quantity))
            .ToArray();

        var payments = visit.Payments
            .OrderByDescending(x => x.PaidAtUtc)
            .Select(payment => new PaymentDto(
                payment.Id,
                payment.Amount,
                payment.Method,
                payment.Notes,
                payment.PaidAtUtc))
            .ToArray();

        var subtotal = treatments.Sum(x => x.LineTotal);
        var total =
            subtotal
            - visit.DiscountAmount
            + visit.ExtraAmount;
        var paid = payments.Sum(x => x.Amount);

        return new PatientVisitDto(
            visit.Id,
            visit.PatientId,
            patientCode,
            patientName,
            visit.DoctorId,
            doctorName,
            visit.VisitDateUtc,
            visit.ClinicalNotes,
            subtotal,
            visit.DiscountAmount,
            visit.ExtraAmount,
            visit.ExtraReason,
            total,
            paid,
            total - paid,
            visit.FollowUpAtUtc,
            visit.FollowUpCompletedAtUtc,
            treatments,
            payments);
    }

    private static bool IsValidFdiTooth(int number)
    {
        var quadrant = number / 10;
        var tooth = number % 10;

        return quadrant is >= 1 and <= 4
            && tooth is >= 1 and <= 8;
    }

    private static VisitWriteResult Fail(
        string code,
        string message)
    {
        return new VisitWriteResult(
            false,
            code,
            message,
            null);
    }

    private static string? CleanOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
