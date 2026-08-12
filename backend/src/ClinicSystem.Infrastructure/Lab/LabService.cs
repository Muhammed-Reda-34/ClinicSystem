using System.Security.Cryptography;
using ClinicSystem.Domain.Entities;
using ClinicSystem.Infrastructure.Audit;
using ClinicSystem.Infrastructure.Common;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.Lab;

public sealed class LabService
{
    private readonly ClinicDbContext _db;
    private readonly AuditService _audit;
    private readonly ClinicSystem.Infrastructure.Finance.AccountingPeriodGuard _periodGuard;

    public LabService(
        ClinicDbContext db,
        AuditService audit,
        ClinicSystem.Infrastructure.Finance.AccountingPeriodGuard periodGuard)
    {
        _db = db;
        _audit = audit;
        _periodGuard = periodGuard;
    }

    public async Task<IReadOnlyCollection<LabPatientLookupDto>>
        LookupPatientsAsync(
            string search,
            IReadOnlyCollection<Guid> allowedDoctorIds,
            CancellationToken cancellationToken)
    {
        if (
            allowedDoctorIds.Count == 0
            || string.IsNullOrWhiteSpace(search)
        )
        {
            return [];
        }

        var term = search.Trim();
        var phoneDigits =
            new string(
                term.Where(char.IsDigit)
                    .ToArray());

        var patients =
            await _db.Patients
            .AsNoTracking()
            .Where(
                patient =>
                    !patient.IsArchived
                    && patient.DoctorAssignments
                    .Any(
                        assignment =>
                            allowedDoctorIds
                            .Contains(
                                assignment.DoctorId))
                    && (
                        patient.PatientCode
                        == term
                        || patient.FormNumber
                        == term
                        || EF.Functions.ILike(
                            patient.FullName,
                            $"%{term}%")
                        || (
                            phoneDigits.Length >= 3
                            && patient.NormalizedPhone
                                .Contains(phoneDigits)
                        )
                    ))
            .OrderBy(
                patient =>
                    patient.FullName)
            .Take(10)
            .Select(
                patient => new
                {
                    patient.Id,
                    patient.PatientCode,
                    patient.FormNumber,
                    patient.FullName,
                    patient.PhoneNumber,
                    patient.DateOfBirth,
                    patient.Gender,
                    patient.Address,
                    patient.IsBlacklisted
                })
            .ToListAsync(
                cancellationToken);

        if (patients.Count == 0)
        {
            return [];
        }

        var patientIds =
            patients
            .Select(x => x.Id)
            .ToArray();

        var recentVisits =
            await (
                from visit
                    in _db.PatientVisits
                    .AsNoTracking()
                join doctor
                    in _db.Doctors
                    .AsNoTracking()
                    on visit.DoctorId
                    equals doctor.Id
                join user
                    in _db.Users
                    .AsNoTracking()
                    on doctor.UserId
                    equals user.Id
                where
                    patientIds.Contains(
                        visit.PatientId)
                    && allowedDoctorIds
                        .Contains(
                            visit.DoctorId)
                orderby
                    visit.VisitDateUtc
                    descending
                select new
                {
                    visit.PatientId,
                    Visit = new LabPatientLookupVisitDto(
                        visit.Id,
                        visit.VisitDateUtc,
                        visit.DoctorId,
                        user.FullName)
                })
            .ToListAsync(
                cancellationToken);

        return patients
            .Select(
                patient =>
                    new LabPatientLookupDto(
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
                        patient.IsBlacklisted,
                        recentVisits
                            .Where(
                                x =>
                                    x.PatientId
                                    == patient.Id)
                            .Take(10)
                            .Select(x => x.Visit)
                            .ToArray()))
            .ToArray();
    }

    public async Task<IReadOnlyCollection<LabOrderDto>>
        GetOrdersAsync(
            IReadOnlyCollection<Guid> allowedDoctorIds,
            int take,
            CancellationToken cancellationToken)
    {
        if (allowedDoctorIds.Count == 0)
        {
            return [];
        }

        take = Math.Clamp(take, 10, 300);

        var orders =
            await _db.LabOrders
            .AsNoTracking()
            .Where(
                x =>
                    allowedDoctorIds
                    .Contains(x.DoctorId))
            .Include(x => x.Teeth)
            .OrderByDescending(
                x => x.CreatedAtUtc)
            .Take(take)
            .ToListAsync(
                cancellationToken);

        if (orders.Count == 0)
        {
            return [];
        }

        var patientIds =
            orders
            .Select(x => x.PatientId)
            .Distinct()
            .ToArray();

        var doctorIds =
            orders
            .Select(x => x.DoctorId)
            .Distinct()
            .ToArray();

        var visitIds =
            orders
            .Where(x => x.VisitId != null)
            .Select(x => x.VisitId!.Value)
            .Distinct()
            .ToArray();

        var patients =
            await _db.Patients
            .AsNoTracking()
            .Where(
                x =>
                    patientIds
                    .Contains(x.Id))
            .ToDictionaryAsync(
                x => x.Id,
                cancellationToken);

        var doctors =
            await (
                from doctor
                    in _db.Doctors
                    .AsNoTracking()
                join user
                    in _db.Users
                    .AsNoTracking()
                    on doctor.UserId
                    equals user.Id
                where doctorIds
                    .Contains(doctor.Id)
                select new
                {
                    doctor.Id,
                    user.FullName
                })
            .ToDictionaryAsync(
                x => x.Id,
                x => x.FullName,
                cancellationToken);

        var visits =
            visitIds.Length == 0
                ? new Dictionary<Guid, DateTime>()
                : await _db.PatientVisits
                    .AsNoTracking()
                    .Where(
                        x =>
                            visitIds
                            .Contains(x.Id))
                    .ToDictionaryAsync(
                        x => x.Id,
                        x => x.VisitDateUtc,
                        cancellationToken);

        return orders
            .Select(
                order =>
                {
                    var patient =
                        patients[order.PatientId];

                    DateTime? visitDate =
                        order.VisitId is not null
                        && visits.TryGetValue(
                            order.VisitId.Value,
                            out var foundDate)
                            ? foundDate
                            : null;

                    return new LabOrderDto(
                        order.Id,
                        order.SerialNumber,
                        order.PatientId,
                        patient.PatientCode,
                        patient.FullName,
                        order.DoctorId,
                        doctors[order.DoctorId],
                        order.VisitId,
                        visitDate,
                        order.CaseDescription,
                        SplitCsv(
                            order.WorkTypesCsv),
                        order.Teeth
                            .Select(
                                x =>
                                    x.ToothFdiNumber)
                            .Order()
                            .ToArray(),
                        SplitCsv(
                            order.MaterialOptionsCsv),
                        order.Shade,
                        order.DigitalPhotosSent,
                        order.ValueLevel,
                        order.OcclusalStaining,
                        order.Instructions,
                        order.CreatedAtUtc);
                })
            .ToArray();
    }

    public async Task<LabWriteResult>
        CreateOrderAsync(
            CreateLabOrderCommand command,
            IReadOnlyCollection<Guid> allowedDoctorIds,
            Guid actorUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        if (
            !allowedDoctorIds
            .Contains(command.DoctorId)
        )
        {
            return Fail(
                "DOCTOR_SCOPE_DENIED",
                "Doctor scope is not allowed.");
        }

        if (
            command.ToothNumbers
            .Any(
                x =>
                    !IsValidFdiTooth(x))
        )
        {
            return Fail(
                "INVALID_TOOTH",
                "One or more tooth numbers are invalid.");
        }

        var patientValid =
            await _db.Patients
            .AsNoTracking()
            .AnyAsync(
                patient =>
                    patient.Id
                    == command.PatientId
                    && patient.DoctorAssignments
                        .Any(
                            assignment =>
                                assignment.DoctorId
                                == command.DoctorId),
                cancellationToken);

        if (!patientValid)
        {
            return Fail(
                "PATIENT_NOT_FOUND",
                "Patient is not assigned to this doctor.");
        }

        if (
            command.VisitId is not null
            && !await VisitMatchesAsync(
                command.VisitId.Value,
                command.PatientId,
                command.DoctorId,
                cancellationToken)
        )
        {
            return Fail(
                "INVALID_VISIT",
                "Visit does not match patient and doctor.");
        }

        var order =
            new LabOrder
            {
                Id = Guid.NewGuid(),
                PatientId =
                    command.PatientId,
                DoctorId =
                    command.DoctorId,
                VisitId =
                    command.VisitId,
                SerialNumber =
                    GenerateSerialNumber(),
                CaseDescription =
                    CleanOptional(
                        command.CaseDescription),
                WorkTypesCsv =
                    ToCsv(
                        command.WorkTypes),
                MaterialOptionsCsv =
                    ToCsv(
                        command.MaterialOptions),
                Shade =
                    CleanOptional(
                        command.Shade),
                DigitalPhotosSent =
                    command.DigitalPhotosSent,
                ValueLevel =
                    CleanOptional(
                        command.ValueLevel),
                OcclusalStaining =
                    CleanOptional(
                        command.OcclusalStaining),
                Instructions =
                    CleanOptional(
                        command.Instructions),
                CreatedByUserId =
                    actorUserId,
                CreatedAtUtc =
                    DateTime.UtcNow,
                UpdatedAtUtc =
                    DateTime.UtcNow
            };

        foreach (
            var tooth
            in command.ToothNumbers
                .Distinct()
        )
        {
            order.Teeth.Add(
                new LabOrderTooth
                {
                    LabOrderId =
                        order.Id,
                    ToothFdiNumber =
                        tooth
                });
        }

        _db.LabOrders.Add(order);

        _audit.Add(
            actorUserId,
            "LabOrderCreated",
            nameof(LabOrder),
            order.Id.ToString(),
            null,
            new
            {
                order.PatientId,
                order.DoctorId,
                order.VisitId,
                order.SerialNumber,
                WorkTypes =
                    command.WorkTypes,
                Materials =
                    command.MaterialOptions,
                Teeth =
                    command.ToothNumbers,
                order.Shade
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return new LabWriteResult(
            true,
            null,
            null,
            order.Id);
    }

    public async Task<IReadOnlyCollection<LabExpenseDto>>
        GetExpensesAsync(
            IReadOnlyCollection<Guid> allowedDoctorIds,
            DateTime? fromUtc,
            DateTime? toUtc,
            int take,
            CancellationToken cancellationToken)
    {
        if (allowedDoctorIds.Count == 0)
        {
            return [];
        }

        take = Math.Clamp(take, 10, 500);

        var query =
            _db.LabExpenses
            .AsNoTracking()
            .Where(
                x =>
                    allowedDoctorIds
                    .Contains(x.DoctorId));

        if (fromUtc is not null)
        {
            query =
                query.Where(
                    x =>
                        x.ExpenseDateUtc
                        >= fromUtc.Value);
        }

        if (toUtc is not null)
        {
            query =
                query.Where(
                    x =>
                        x.ExpenseDateUtc
                        < toUtc.Value);
        }

        var rows =
            await query
            .OrderByDescending(
                x => x.ExpenseDateUtc)
            .Take(take)
            .ToListAsync(
                cancellationToken);

        if (rows.Count == 0)
        {
            return [];
        }

        var patientIds =
            rows.Select(x => x.PatientId)
                .Distinct()
                .ToArray();

        var doctorIds =
            rows.Select(x => x.DoctorId)
                .Distinct()
                .ToArray();

        var visitIds =
            rows
            .Where(x => x.VisitId != null)
            .Select(x => x.VisitId!.Value)
            .Distinct()
            .ToArray();

        var patients =
            await _db.Patients
            .AsNoTracking()
            .Where(x => patientIds.Contains(x.Id))
            .ToDictionaryAsync(
                x => x.Id,
                cancellationToken);

        var doctors =
            await (
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

        var visits =
            visitIds.Length == 0
                ? new Dictionary<Guid, DateTime>()
                : await _db.PatientVisits
                    .AsNoTracking()
                    .Where(x => visitIds.Contains(x.Id))
                    .ToDictionaryAsync(
                        x => x.Id,
                        x => x.VisitDateUtc,
                        cancellationToken);

        return rows
            .Select(
                expense =>
                {
                    DateTime? visitDate =
                        expense.VisitId is not null
                        && visits.TryGetValue(
                            expense.VisitId.Value,
                            out var found)
                            ? found
                            : null;

                    var patient =
                        patients[expense.PatientId];

                    return new LabExpenseDto(
                        expense.Id,
                        expense.PatientId,
                        patient.PatientCode,
                        patient.FullName,
                        expense.DoctorId,
                        doctors[expense.DoctorId],
                        expense.VisitId,
                        visitDate,
                        expense.LabOrderId,
                        expense.ServiceOrItemName,
                        expense.Amount,
                        expense.ExpenseDateUtc,
                        expense.Notes,
                        expense.CreatedByUserId,
                        expense.CreatedAtUtc);
                })
            .ToArray();
    }

    public async Task<LabWriteResult>
        CreateExpenseAsync(
            CreateLabExpenseCommand command,
            IReadOnlyCollection<Guid> allowedDoctorIds,
            Guid actorUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        if (
            !allowedDoctorIds
            .Contains(command.DoctorId)
        )
        {
            return Fail(
                "DOCTOR_SCOPE_DENIED",
                "Doctor scope is not allowed.");
        }

        if (command.Amount <= 0)
        {
            return Fail(
                "INVALID_AMOUNT",
                "Amount must be greater than zero.");
        }

        if (
            !await _periodGuard.IsOpenAsync(
                command.ExpenseDateUtc,
                cancellationToken)
        )
        {
            return Fail(
                "ACCOUNTING_PERIOD_CLOSED",
                "Accounting period is closed.");
        }

        var patientValid =
            await _db.Patients
            .AsNoTracking()
            .AnyAsync(
                patient =>
                    patient.Id
                    == command.PatientId
                    && patient.DoctorAssignments
                        .Any(
                            assignment =>
                                assignment.DoctorId
                                == command.DoctorId),
                cancellationToken);

        if (!patientValid)
        {
            return Fail(
                "PATIENT_NOT_FOUND",
                "Patient is not assigned to this doctor.");
        }

        if (
            command.VisitId is not null
            && !await VisitMatchesAsync(
                command.VisitId.Value,
                command.PatientId,
                command.DoctorId,
                cancellationToken)
        )
        {
            return Fail(
                "INVALID_VISIT",
                "Visit does not match patient and doctor.");
        }

        if (
            command.LabOrderId is not null
            && !await _db.LabOrders
                .AsNoTracking()
                .AnyAsync(
                    order =>
                        order.Id
                        == command.LabOrderId.Value
                        && order.PatientId
                        == command.PatientId
                        && order.DoctorId
                        == command.DoctorId,
                    cancellationToken)
        )
        {
            return Fail(
                "INVALID_LAB_ORDER",
                "Lab order does not match patient and doctor.");
        }

        var expense =
            new LabExpense
            {
                Id = Guid.NewGuid(),
                PatientId =
                    command.PatientId,
                DoctorId =
                    command.DoctorId,
                VisitId =
                    command.VisitId,
                LabOrderId =
                    command.LabOrderId,
                ServiceOrItemName =
                    command.ServiceOrItemName
                    .Trim(),
                Amount =
                    command.Amount,
                ExpenseDateUtc =
                    command.ExpenseDateUtc,
                Notes =
                    CleanOptional(
                        command.Notes),
                CreatedByUserId =
                    actorUserId,
                CreatedAtUtc =
                    DateTime.UtcNow
            };

        _db.LabExpenses.Add(expense);

        _audit.Add(
            actorUserId,
            "LabExpenseCreated",
            nameof(LabExpense),
            expense.Id.ToString(),
            null,
            new
            {
                expense.PatientId,
                expense.DoctorId,
                expense.VisitId,
                expense.LabOrderId,
                expense.ServiceOrItemName,
                expense.Amount,
                expense.ExpenseDateUtc
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return new LabWriteResult(
            true,
            null,
            null,
            expense.Id);
    }

    private async Task<bool> VisitMatchesAsync(
        Guid visitId,
        Guid patientId,
        Guid doctorId,
        CancellationToken cancellationToken)
    {
        return await _db.PatientVisits
            .AsNoTracking()
            .AnyAsync(
                visit =>
                    visit.Id == visitId
                    && visit.PatientId == patientId
                    && visit.DoctorId == doctorId,
                cancellationToken);
    }

    private static bool IsValidFdiTooth(
        int tooth)
    {
        var quadrant = tooth / 10;
        var position = tooth % 10;

        return quadrant is >= 1 and <= 4
            && position is >= 1 and <= 8;
    }

    private static string GenerateSerialNumber()
    {
        return $"LAB-{DateTime.UtcNow:yyyyMMdd}-{RandomNumberGenerator.GetHexString(6)}";
    }

    private static string ToCsv(
        IEnumerable<string> values)
    {
        return string.Join(
            "|",
            values
                .Select(x => x.Trim())
                .Where(x => x.Length > 0)
                .Distinct(
                    StringComparer.OrdinalIgnoreCase));
    }

    private static IReadOnlyCollection<string> SplitCsv(
        string value)
    {
        return value
            .Split(
                '|',
                StringSplitOptions.RemoveEmptyEntries
                | StringSplitOptions.TrimEntries)
            .ToArray();
    }

    private static string? CleanOptional(
        string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }

    private static LabWriteResult Fail(
        string code,
        string message)
    {
        return new LabWriteResult(
            false,
            code,
            message,
            null);
    }
}
