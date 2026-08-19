using ClinicSystem.Domain.Entities;
using ClinicSystem.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.Visits;

public sealed partial class VisitService
{
    public async Task<VisitWriteResult> UpdateAsync(
        Guid visitId,
        UpdateVisitCommand command,
        IReadOnlyCollection<Guid> allowedDoctorIds,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        if (command.Treatments.Count == 0)
        {
            return Fail("TREATMENT_REQUIRED", "Add at least one treatment.");
        }

        if (command.DiscountAmount < 0 || command.ExtraAmount < 0)
        {
            return Fail("INVALID_AMOUNT", "Amounts cannot be negative.");
        }

        foreach (var treatment in command.Treatments)
        {
            if (treatment.Quantity < 1 || treatment.Quantity > 100)
            {
                return Fail("INVALID_QUANTITY", "Treatment quantity is invalid.");
            }

            if (treatment.ToothNumbers.Any(x => !IsValidFdiTooth(x)))
            {
                return Fail("INVALID_TOOTH", "One or more tooth numbers are invalid.");
            }
        }

        var visit = await _db.PatientVisits
            .Include(x => x.TreatmentItems)
                .ThenInclude(x => x.Teeth)
            .Include(x => x.Payments)
            .SingleOrDefaultAsync(
                x =>
                    x.Id == visitId
                    && !x.IsVoided
                    && allowedDoctorIds.Contains(x.DoctorId),
                cancellationToken);

        if (visit is null)
        {
            return Fail("NOT_FOUND", "Visit was not found.");
        }

        if (!command.IsHistoricalEntry)
        {
            if (!await _periodGuard.IsOpenAsync(visit.VisitDateUtc, cancellationToken))
            {
                return Fail(
                    "ACCOUNTING_PERIOD_CLOSED",
                    "The accounting period for the existing visit is closed.");
            }

            if (!await _periodGuard.IsOpenAsync(command.VisitDateUtc, cancellationToken))
            {
                return Fail(
                    "ACCOUNTING_PERIOD_CLOSED",
                    "The accounting period for the new visit date is closed.");
            }
        }

        var requestedExistingIds = command.Treatments
            .Where(x => x.TreatmentItemId.HasValue)
            .Select(x => x.TreatmentItemId!.Value)
            .ToArray();

        if (requestedExistingIds.Length != requestedExistingIds.Distinct().Count())
        {
            return Fail("DUPLICATE_TREATMENT", "A treatment item was submitted more than once.");
        }

        if (requestedExistingIds.Any(id => visit.TreatmentItems.All(x => x.Id != id)))
        {
            return Fail("INVALID_TREATMENT", "One or more treatment items do not belong to this visit.");
        }

        var removedItems = visit.TreatmentItems
            .Where(x => !requestedExistingIds.Contains(x.Id))
            .ToArray();

        if (removedItems.Length > 0)
        {
            var removedCases = removedItems
                .Select(x => x.TreatmentCaseId)
                .Distinct()
                .ToArray();

            var hasLinkedSessions = await _db.VisitTreatmentItems
                .AsNoTracking()
                .AnyAsync(
                    x =>
                        removedCases.Contains(x.TreatmentCaseId)
                        && x.VisitId != visit.Id
                        && !x.Visit.IsVoided,
                    cancellationToken);

            if (hasLinkedSessions)
            {
                return Fail(
                    "TREATMENT_CASE_HAS_SESSIONS",
                    "A treatment linked to follow-up sessions cannot be removed from this visit.");
            }
        }

        var existingCaseIds = visit.TreatmentItems
            .Select(x => x.TreatmentCaseId)
            .Distinct()
            .ToArray();

        var multiSessionCaseIds = await _db.VisitTreatmentItems
            .AsNoTracking()
            .Where(x =>
                existingCaseIds.Contains(x.TreatmentCaseId)
                && !x.Visit.IsVoided)
            .GroupBy(x => x.TreatmentCaseId)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .ToListAsync(cancellationToken);

        foreach (var requested in command.Treatments.Where(x => x.TreatmentItemId.HasValue))
        {
            var existing = visit.TreatmentItems.Single(x => x.Id == requested.TreatmentItemId!.Value);
            var desiredTeeth = requested.ToothNumbers.Distinct().Order().ToArray();
            var existingTeeth = existing.Teeth.Select(x => x.ToothFdiNumber).Distinct().Order().ToArray();

            if ((existing.SessionNumber > 1 || multiSessionCaseIds.Contains(existing.TreatmentCaseId))
                && (existing.DentalServiceId != requested.DentalServiceId
                    || !existingTeeth.SequenceEqual(desiredTeeth)))
            {
                return Fail(
                    "MULTI_SESSION_TREATMENT_LOCKED",
                    "The service and teeth of a multi-session treatment cannot be changed after sessions are linked.");
            }
        }

        var serviceIds = command.Treatments
            .Select(x => x.DentalServiceId)
            .Distinct()
            .ToArray();

        var services = await _db.DentalServices
            .Where(x => serviceIds.Contains(x.Id) && x.IsActive)
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        if (services.Count != serviceIds.Length)
        {
            return Fail("INVALID_SERVICE", "One or more services are unavailable.");
        }

        var before = new
        {
            visit.VisitDateUtc,
            visit.ClinicalNotes,
            visit.DiscountAmount,
            visit.ExtraAmount,
            visit.ExtraReason,
            visit.FollowUpAtUtc,
            Treatments = visit.TreatmentItems.Select(x => new
            {
                x.Id,
                x.DentalServiceId,
                x.ServiceNameArSnapshot,
                x.UnitPriceSnapshot,
                x.Quantity,
                Teeth = x.Teeth.Select(t => t.ToothFdiNumber).Order().ToArray(),
                x.Notes,
                x.TreatmentCaseId,
                x.SessionNumber,
                x.CompletesTreatmentCase
            }).ToArray()
        };

        foreach (var removed in removedItems)
        {
            _db.VisitTreatmentItems.Remove(removed);
        }

        foreach (var requested in command.Treatments)
        {
            var service = services[requested.DentalServiceId];
            VisitTreatmentItem item;

            if (requested.TreatmentItemId.HasValue)
            {
                item = visit.TreatmentItems.Single(x => x.Id == requested.TreatmentItemId.Value);

                if (item.DentalServiceId != requested.DentalServiceId)
                {
                    item.DentalServiceId = service.Id;
                    item.ServiceNameArSnapshot = service.NameAr;
                    item.ServiceNameEnSnapshot = service.NameEn;
                    item.UnitPriceSnapshot = service.CurrentPrice;
                }

                item.Quantity = requested.Quantity;
                item.Notes = CleanOptional(requested.Notes);
                item.CompletesTreatmentCase = requested.CompletesTreatmentCase;

                var desiredTeeth = requested.ToothNumbers.Distinct().ToHashSet();
                var teethToRemove = item.Teeth
                    .Where(x => !desiredTeeth.Contains(x.ToothFdiNumber))
                    .ToArray();

                foreach (var toothEntity in teethToRemove)
                {
                    item.Teeth.Remove(toothEntity);
                }

                var existingTeeth = item.Teeth
                    .Select(x => x.ToothFdiNumber)
                    .ToHashSet();

                foreach (var tooth in desiredTeeth.Where(x => !existingTeeth.Contains(x)))
                {
                    item.Teeth.Add(new VisitTreatmentTooth
                    {
                        VisitTreatmentItemId = item.Id,
                        ToothFdiNumber = tooth
                    });
                }
            }
            else
            {
                item = new VisitTreatmentItem
                {
                    Id = Guid.NewGuid(),
                    VisitId = visit.Id,
                    DentalServiceId = service.Id,
                    ServiceNameArSnapshot = service.NameAr,
                    ServiceNameEnSnapshot = service.NameEn,
                    UnitPriceSnapshot = service.CurrentPrice,
                    Quantity = requested.Quantity,
                    Notes = CleanOptional(requested.Notes),
                    TreatmentCaseId = Guid.NewGuid(),
                    SessionNumber = 1,
                    CompletesTreatmentCase = requested.CompletesTreatmentCase
                };

                foreach (var tooth in requested.ToothNumbers.Distinct())
                {
                    item.Teeth.Add(new VisitTreatmentTooth
                    {
                        VisitTreatmentItemId = item.Id,
                        ToothFdiNumber = tooth
                    });
                }

                visit.TreatmentItems.Add(item);
            }
        }

        var subtotal = visit.TreatmentItems
            .Where(x => !_db.Entry(x).State.Equals(EntityState.Deleted))
            .Sum(x => x.UnitPriceSnapshot * x.Quantity);

        var total = subtotal - command.DiscountAmount + command.ExtraAmount;
        var paid = visit.Payments.Sum(x => x.Amount);

        if (total < 0)
        {
            return Fail("INVALID_TOTAL", "Discount cannot make the visit total negative.");
        }

        if (total < paid)
        {
            return Fail(
                "TOTAL_BELOW_PAID",
                "The edited visit total cannot be lower than payments already collected.");
        }

        visit.VisitDateUtc = command.VisitDateUtc;
        visit.ClinicalNotes = CleanOptional(command.ClinicalNotes);
        visit.DiscountAmount = command.DiscountAmount;
        visit.ExtraAmount = command.ExtraAmount;
        visit.ExtraReason = command.ExtraAmount > 0
            ? CleanOptional(command.ExtraReason)
            : null;
        visit.FollowUpAtUtc = command.FollowUpAtUtc;

        if (command.FollowUpAtUtc is null)
        {
            visit.FollowUpCompletedAtUtc = null;
            visit.FollowUpCompletedByUserId = null;
        }

        _audit.Add(
            actorUserId,
            "PatientVisitUpdated",
            nameof(PatientVisit),
            visit.Id.ToString(),
            before,
            new
            {
                visit.VisitDateUtc,
                visit.ClinicalNotes,
                visit.DiscountAmount,
                visit.ExtraAmount,
                visit.ExtraReason,
                visit.FollowUpAtUtc,
                Total = total,
                Paid = paid,
                Treatments = command.Treatments.Select(x => new
                {
                    x.TreatmentItemId,
                    x.DentalServiceId,
                    x.Quantity,
                    x.ToothNumbers,
                    x.Notes,
                    x.CompletesTreatmentCase
                }),
                command.IsHistoricalEntry
            },
            ipAddress);

        await _db.SaveChangesAsync(cancellationToken);

        return new VisitWriteResult(true, null, null, visit.Id);
    }

    public async Task<VisitWriteResult> VoidAsync(
        Guid visitId,
        string? reason,
        IReadOnlyCollection<Guid> allowedDoctorIds,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var cleanReason = CleanOptional(reason);
        if (cleanReason is null)
        {
            return Fail("VOID_REASON_REQUIRED", "A reason is required to delete a visit.");
        }

        var visit = await _db.PatientVisits
            .Include(x => x.Payments)
            .Include(x => x.TreatmentItems)
            .SingleOrDefaultAsync(
                x =>
                    x.Id == visitId
                    && !x.IsVoided
                    && allowedDoctorIds.Contains(x.DoctorId),
                cancellationToken);

        if (visit is null)
        {
            return Fail("NOT_FOUND", "Visit was not found.");
        }

        if (visit.Payments.Count > 0)
        {
            return Fail(
                "VISIT_HAS_PAYMENTS",
                "Delete the visit payments first before deleting the visit.");
        }

        var linkedToLab = await _db.LabOrders
            .AsNoTracking()
            .AnyAsync(x => x.VisitId == visit.Id, cancellationToken)
            || await _db.LabExpenses
                .AsNoTracking()
                .AnyAsync(x => x.VisitId == visit.Id, cancellationToken);

        if (linkedToLab)
        {
            return Fail(
                "VISIT_LINKED_TO_LAB",
                "This visit is linked to laboratory records and cannot be deleted.");
        }

        foreach (var treatment in visit.TreatmentItems)
        {
            var hasLaterSession = await _db.VisitTreatmentItems
                .AsNoTracking()
                .AnyAsync(
                    x =>
                        x.TreatmentCaseId == treatment.TreatmentCaseId
                        && x.SessionNumber > treatment.SessionNumber
                        && !x.Visit.IsVoided,
                    cancellationToken);

            if (hasLaterSession)
            {
                return Fail(
                    "VISIT_HAS_LATER_TREATMENT_SESSIONS",
                    "A later treatment session depends on this visit. Delete the latest session first.");
            }
        }

        visit.IsVoided = true;
        visit.VoidedAtUtc = DateTime.UtcNow;
        visit.VoidedByUserId = actorUserId;
        visit.VoidReason = cleanReason;

        if (visit.AppointmentId is not null)
        {
            var hasAnotherVisit = await _db.PatientVisits
                .AsNoTracking()
                .AnyAsync(
                    x =>
                        x.Id != visit.Id
                        && !x.IsVoided
                        && x.AppointmentId == visit.AppointmentId,
                    cancellationToken);

            if (!hasAnotherVisit)
            {
                var appointment = await _db.Appointments
                    .SingleOrDefaultAsync(x => x.Id == visit.AppointmentId.Value, cancellationToken);

                if (appointment is not null
                    && appointment.AttendanceStatus == AppointmentAttendanceStatus.Attended)
                {
                    appointment.AttendanceStatus = AppointmentAttendanceStatus.Scheduled;
                    appointment.UpdatedAtUtc = DateTime.UtcNow;
                }
            }
        }

        _audit.Add(
            actorUserId,
            "PatientVisitVoided",
            nameof(PatientVisit),
            visit.Id.ToString(),
            new
            {
                visit.PatientId,
                visit.DoctorId,
                visit.VisitDateUtc,
                visit.IsVoided
            },
            new
            {
                IsVoided = true,
                visit.VoidedAtUtc,
                visit.VoidedByUserId,
                visit.VoidReason
            },
            ipAddress);

        await _db.SaveChangesAsync(cancellationToken);
        return new VisitWriteResult(true, null, null, visit.Id);
    }

    public async Task<VisitWriteResult> CreateTreatmentSessionAsync(
        Guid treatmentItemId,
        CreateTreatmentSessionCommand command,
        IReadOnlyCollection<Guid> allowedDoctorIds,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var source = await _db.VisitTreatmentItems
            .Include(x => x.Teeth)
            .Include(x => x.Visit)
            .SingleOrDefaultAsync(
                x =>
                    x.Id == treatmentItemId
                    && !x.Visit.IsVoided
                    && allowedDoctorIds.Contains(x.Visit.DoctorId),
                cancellationToken);

        if (source is null)
        {
            return Fail("NOT_FOUND", "Treatment session source was not found.");
        }

        var latestSessionNumber = await _db.VisitTreatmentItems
            .AsNoTracking()
            .Where(x =>
                x.TreatmentCaseId == source.TreatmentCaseId
                && !x.Visit.IsVoided)
            .MaxAsync(x => x.SessionNumber, cancellationToken);

        if (source.SessionNumber != latestSessionNumber)
        {
            return Fail(
                "NOT_LATEST_SESSION",
                "A new treatment session can only be created from the latest session.");
        }

        if (!command.IsHistoricalEntry
            && !await _periodGuard.IsOpenAsync(command.VisitDateUtc, cancellationToken))
        {
            return Fail(
                "ACCOUNTING_PERIOD_CLOSED",
                "The accounting period for this treatment session is closed.");
        }

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        var visit = new PatientVisit
        {
            Id = Guid.NewGuid(),
            PatientId = source.Visit.PatientId,
            DoctorId = source.Visit.DoctorId,
            VisitDateUtc = command.VisitDateUtc,
            ClinicalNotes = CleanOptional(command.ClinicalNotes),
            FollowUpAtUtc = command.FollowUpAtUtc,
            CreatedByUserId = actorUserId,
            CreatedAtUtc = DateTime.UtcNow
        };

        var continuation = new VisitTreatmentItem
        {
            Id = Guid.NewGuid(),
            VisitId = visit.Id,
            DentalServiceId = source.DentalServiceId,
            ServiceNameArSnapshot = source.ServiceNameArSnapshot,
            ServiceNameEnSnapshot = source.ServiceNameEnSnapshot,
            // Continuation sessions do not bill the full treatment again.
            // Any separate charge can be added as another service on a normal visit.
            UnitPriceSnapshot = 0,
            Quantity = 1,
            Notes = CleanOptional(command.SessionNotes),
            TreatmentCaseId = source.TreatmentCaseId,
            SessionNumber = latestSessionNumber + 1,
            CompletesTreatmentCase = command.CompletesTreatmentCase
        };

        foreach (var tooth in source.Teeth.Select(x => x.ToothFdiNumber).Distinct())
        {
            continuation.Teeth.Add(new VisitTreatmentTooth
            {
                VisitTreatmentItemId = continuation.Id,
                ToothFdiNumber = tooth
            });
        }

        visit.TreatmentItems.Add(continuation);
        _db.PatientVisits.Add(visit);

        _audit.Add(
            actorUserId,
            "TreatmentSessionCreated",
            nameof(VisitTreatmentItem),
            continuation.Id.ToString(),
            null,
            new
            {
                SourceTreatmentItemId = source.Id,
                continuation.TreatmentCaseId,
                continuation.SessionNumber,
                continuation.CompletesTreatmentCase,
                visit.PatientId,
                visit.DoctorId,
                visit.VisitDateUtc,
                visit.FollowUpAtUtc,
                SessionNotes = continuation.Notes,
                visit.ClinicalNotes,
                command.IsHistoricalEntry
            },
            ipAddress);

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new VisitWriteResult(true, null, null, visit.Id);
    }
}
