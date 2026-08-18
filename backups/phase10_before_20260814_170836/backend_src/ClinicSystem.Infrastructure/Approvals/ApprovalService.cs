using System.Text.Json;
using ClinicSystem.Domain.Entities;
using ClinicSystem.Domain.Enums;
using ClinicSystem.Infrastructure.Audit;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.Approvals;

public sealed class ApprovalService
{
    public const int ExpirationHours = 48;

    private readonly ClinicDbContext _db;
    private readonly AuditService _audit;

    public ApprovalService(
        ClinicDbContext db,
        AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<IReadOnlyCollection<ApprovalRequestListItemDto>>
        GetPendingAsync(
            IReadOnlyCollection<Guid> approverDoctorIds,
            bool isOwner,
            CancellationToken cancellationToken)
    {
        await ExpirePendingAsync(
            cancellationToken);

        var query =
            _db.ApprovalRequests
            .AsNoTracking()
            .Where(
                x =>
                    x.Status
                    == ApprovalRequestStatus.Pending);

        if (!isOwner)
        {
            query =
                query.Where(
                    x =>
                        approverDoctorIds
                        .Contains(
                            x.RequiredDoctorId));
        }

        var rows =
            await query
            .OrderBy(x => x.ExpiresAtUtc)
            .Take(200)
            .ToListAsync(
                cancellationToken);

        if (rows.Count == 0)
        {
            return [];
        }

        var userIds =
            rows
            .Select(x => x.RequestedByUserId)
            .Distinct()
            .ToArray();

        var doctorIds =
            rows
            .Select(x => x.RequiredDoctorId)
            .Distinct()
            .ToArray();

        var users =
            await _db.Users
            .AsNoTracking()
            .Where(x => userIds.Contains(x.Id))
            .ToDictionaryAsync(
                x => x.Id,
                x => x.FullName,
                cancellationToken);

        var doctors =
            await (
                from doctor
                    in _db.Doctors.AsNoTracking()
                join user
                    in _db.Users.AsNoTracking()
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

        return rows
            .Select(
                request =>
                    new ApprovalRequestListItemDto(
                        request.Id,
                        request.RequestType,
                        request.EntityType,
                        request.EntityId,
                        request.RequestedAction,
                        request.Status,
                        request.RequestedByUserId,
                        users.GetValueOrDefault(
                            request.RequestedByUserId,
                            "Unknown"),
                        request.RequiredDoctorId,
                        doctors.GetValueOrDefault(
                            request.RequiredDoctorId,
                            "Unknown doctor"),
                        request.RequestedAtUtc,
                        request.ExpiresAtUtc,
                        request.PayloadJson))
            .ToArray();
    }

    public async Task<int> GetPendingCountAsync(
        IReadOnlyCollection<Guid> approverDoctorIds,
        bool isOwner,
        CancellationToken cancellationToken)
    {
        await ExpirePendingAsync(
            cancellationToken);

        var query =
            _db.ApprovalRequests
            .AsNoTracking()
            .Where(
                x =>
                    x.Status
                    == ApprovalRequestStatus.Pending);

        if (!isOwner)
        {
            query =
                query.Where(
                    x =>
                        approverDoctorIds
                        .Contains(
                            x.RequiredDoctorId));
        }

        return await query.CountAsync(
            cancellationToken);
    }

    public async Task<ApprovalRequestWriteResult>
        RequestPatientArchiveAsync(
            Guid patientId,
            Guid requiredDoctorId,
            IReadOnlyCollection<Guid> requesterDoctorScope,
            Guid requesterUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        if (
            !requesterDoctorScope
            .Contains(requiredDoctorId)
        )
        {
            return Fail(
                "DOCTOR_SCOPE_DENIED",
                "Selected doctor is outside your scope.");
        }

        var patient =
            await _db.Patients
            .AsNoTracking()
            .SingleOrDefaultAsync(
                x =>
                    x.Id == patientId
                    && !x.IsArchived
                    && x.DoctorAssignments
                        .Any(
                            a =>
                                a.DoctorId
                                == requiredDoctorId),
                cancellationToken);

        if (patient is null)
        {
            return Fail(
                "PATIENT_NOT_FOUND",
                "Patient was not found.");
        }

        var duplicatePending =
            await _db.ApprovalRequests
            .AnyAsync(
                x =>
                    x.Status
                    == ApprovalRequestStatus.Pending
                    && x.RequestType
                    == "PatientArchive"
                    && x.EntityId
                    == patientId.ToString(),
                cancellationToken);

        if (duplicatePending)
        {
            return Fail(
                "REQUEST_ALREADY_PENDING",
                "A deletion request is already pending for this patient.");
        }

        return await CreateRequestAsync(
            "PatientArchive",
            "Patient",
            patientId.ToString(),
            "ArchivePatient",
            new
            {
                patient.PatientCode,
                patient.FullName,
                patient.PhoneNumber
            },
            requesterUserId,
            requiredDoctorId,
            ipAddress,
            cancellationToken);
    }

    public async Task<ApprovalRequestWriteResult>
        RequestAttachmentDeleteAsync(
            Guid attachmentId,
            Guid requiredDoctorId,
            IReadOnlyCollection<Guid> requesterDoctorScope,
            Guid requesterUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        if (
            !requesterDoctorScope
            .Contains(requiredDoctorId)
        )
        {
            return Fail(
                "DOCTOR_SCOPE_DENIED",
                "Selected doctor is outside your scope.");
        }

        var attachment =
            await _db.PatientAttachments
            .AsNoTracking()
            .Include(x => x.Patient)
                .ThenInclude(x => x.DoctorAssignments)
            .SingleOrDefaultAsync(
                x =>
                    x.Id == attachmentId
                    && x.Patient.DoctorAssignments
                        .Any(
                            a =>
                                a.DoctorId
                                == requiredDoctorId),
                cancellationToken);

        if (attachment is null)
        {
            return Fail(
                "ATTACHMENT_NOT_FOUND",
                "Attachment was not found.");
        }

        var duplicatePending =
            await _db.ApprovalRequests
            .AnyAsync(
                x =>
                    x.Status
                    == ApprovalRequestStatus.Pending
                    && x.RequestType
                    == "AttachmentDelete"
                    && x.EntityId
                    == attachmentId.ToString(),
                cancellationToken);

        if (duplicatePending)
        {
            return Fail(
                "REQUEST_ALREADY_PENDING",
                "A deletion request is already pending for this file.");
        }

        return await CreateRequestAsync(
            "AttachmentDelete",
            "PatientAttachment",
            attachmentId.ToString(),
            "DeleteAttachment",
            new
            {
                attachment.PatientId,
                attachment.OriginalFileName,
                attachment.Category
            },
            requesterUserId,
            requiredDoctorId,
            ipAddress,
            cancellationToken);
    }

    public async Task<ApprovalRequestWriteResult>
        ApproveAsync(
            Guid requestId,
            IReadOnlyCollection<Guid> approverDoctorIds,
            bool isOwner,
            Guid reviewerUserId,
            string? reviewNote,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        await using var transaction =
            await _db.Database
            .BeginTransactionAsync(
                cancellationToken);

        var request =
            await _db.ApprovalRequests
            .SingleOrDefaultAsync(
                x => x.Id == requestId,
                cancellationToken);

        if (request is null)
        {
            return Fail(
                "NOT_FOUND",
                "Approval request was not found.");
        }

        if (
            request.Status
            != ApprovalRequestStatus.Pending
        )
        {
            return Fail(
                "NOT_PENDING",
                "Approval request is no longer pending.");
        }

        if (
            request.ExpiresAtUtc
            <= DateTime.UtcNow
        )
        {
            request.Status =
                ApprovalRequestStatus.Expired;

            await _db.SaveChangesAsync(
                cancellationToken);

            await transaction.CommitAsync(
                cancellationToken);

            return Fail(
                "REQUEST_EXPIRED",
                "Approval request has expired.");
        }

        if (
            !isOwner
            && !approverDoctorIds
                .Contains(
                    request.RequiredDoctorId)
        )
        {
            return Fail(
                "APPROVER_SCOPE_DENIED",
                "You cannot approve this request.");
        }

        var actionResult =
            await ExecuteApprovedActionAsync(
                request,
                reviewerUserId,
                ipAddress,
                cancellationToken);

        if (!actionResult.Succeeded)
        {
            await transaction.RollbackAsync(
                cancellationToken);

            return actionResult;
        }

        request.Status =
            ApprovalRequestStatus.Approved;
        request.ReviewedByUserId =
            reviewerUserId;
        request.ReviewedAtUtc =
            DateTime.UtcNow;
        request.ReviewNote =
            CleanOptional(reviewNote);

        _audit.Add(
            reviewerUserId,
            "ApprovalRequestApproved",
            nameof(ApprovalRequest),
            request.Id.ToString(),
            new
            {
                Status =
                    ApprovalRequestStatus.Pending
            },
            new
            {
                request.Status,
                request.RequestType,
                request.EntityType,
                request.EntityId,
                request.RequestedByUserId,
                request.RequiredDoctorId
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        await transaction.CommitAsync(
            cancellationToken);

        return new ApprovalRequestWriteResult(
            true,
            null,
            null,
            request.Id);
    }

    public async Task<ApprovalRequestWriteResult>
        RejectAsync(
            Guid requestId,
            IReadOnlyCollection<Guid> approverDoctorIds,
            bool isOwner,
            Guid reviewerUserId,
            string? reviewNote,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        var request =
            await _db.ApprovalRequests
            .SingleOrDefaultAsync(
                x => x.Id == requestId,
                cancellationToken);

        if (request is null)
        {
            return Fail(
                "NOT_FOUND",
                "Approval request was not found.");
        }

        if (
            request.Status
            != ApprovalRequestStatus.Pending
        )
        {
            return Fail(
                "NOT_PENDING",
                "Approval request is no longer pending.");
        }

        if (
            !isOwner
            && !approverDoctorIds
                .Contains(
                    request.RequiredDoctorId)
        )
        {
            return Fail(
                "APPROVER_SCOPE_DENIED",
                "You cannot review this request.");
        }

        request.Status =
            ApprovalRequestStatus.Rejected;
        request.ReviewedByUserId =
            reviewerUserId;
        request.ReviewedAtUtc =
            DateTime.UtcNow;
        request.ReviewNote =
            CleanOptional(reviewNote);

        _audit.Add(
            reviewerUserId,
            "ApprovalRequestRejected",
            nameof(ApprovalRequest),
            request.Id.ToString(),
            new
            {
                Status =
                    ApprovalRequestStatus.Pending
            },
            new
            {
                request.Status,
                request.RequestType,
                request.EntityType,
                request.EntityId
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return new ApprovalRequestWriteResult(
            true,
            null,
            null,
            request.Id);
    }

    public async Task<int> ExpirePendingAsync(
        CancellationToken cancellationToken)
    {
        var now =
            DateTime.UtcNow;

        return await _db.ApprovalRequests
            .Where(
                x =>
                    x.Status
                    == ApprovalRequestStatus.Pending
                    && x.ExpiresAtUtc <= now)
            .ExecuteUpdateAsync(
                setters =>
                    setters
                    .SetProperty(
                        x => x.Status,
                        ApprovalRequestStatus.Expired),
                cancellationToken);
    }

    private async Task<ApprovalRequestWriteResult>
        CreateRequestAsync(
            string requestType,
            string entityType,
            string entityId,
            string requestedAction,
            object payload,
            Guid requesterUserId,
            Guid requiredDoctorId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        var now =
            DateTime.UtcNow;

        var request =
            new ApprovalRequest
            {
                Id = Guid.NewGuid(),
                RequestType = requestType,
                EntityType = entityType,
                EntityId = entityId,
                RequestedAction = requestedAction,
                PayloadJson =
                    JsonSerializer.Serialize(
                        payload),
                RequestedByUserId =
                    requesterUserId,
                RequiredDoctorId =
                    requiredDoctorId,
                Status =
                    ApprovalRequestStatus.Pending,
                RequestedAtUtc = now,
                ExpiresAtUtc =
                    now.AddHours(
                        ExpirationHours)
            };

        _db.ApprovalRequests.Add(
            request);

        _audit.Add(
            requesterUserId,
            "ApprovalRequestCreated",
            nameof(ApprovalRequest),
            request.Id.ToString(),
            null,
            new
            {
                request.RequestType,
                request.EntityType,
                request.EntityId,
                request.RequiredDoctorId,
                request.ExpiresAtUtc
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return new ApprovalRequestWriteResult(
            true,
            null,
            null,
            request.Id);
    }

    private async Task<ApprovalRequestWriteResult>
        ExecuteApprovedActionAsync(
            ApprovalRequest request,
            Guid reviewerUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        if (
            request.RequestType
            == "PatientArchive"
            && Guid.TryParse(
                request.EntityId,
                out var patientId)
        )
        {
            var patient =
                await _db.Patients
                .SingleOrDefaultAsync(
                    x => x.Id == patientId,
                    cancellationToken);

            if (patient is null)
            {
                return Fail(
                    "PATIENT_NOT_FOUND",
                    "Patient was not found.");
            }

            var before =
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
                reviewerUserId;
            patient.UpdatedAtUtc =
                DateTime.UtcNow;

            _audit.Add(
                reviewerUserId,
                "PatientArchivedAfterApproval",
                "Patient",
                patient.Id.ToString(),
                before,
                new
                {
                    patient.IsArchived,
                    patient.ArchivedAtUtc,
                    patient.ArchivedByUserId,
                    ApprovalRequestId =
                        request.Id
                },
                ipAddress);

            return Success(request.Id);
        }

        if (
            request.RequestType
            == "AttachmentDelete"
            && Guid.TryParse(
                request.EntityId,
                out var attachmentId)
        )
        {
            var attachment =
                await _db.PatientAttachments
                .SingleOrDefaultAsync(
                    x => x.Id == attachmentId,
                    cancellationToken);

            if (attachment is null)
            {
                return Fail(
                    "ATTACHMENT_NOT_FOUND",
                    "Attachment was not found.");
            }

            var old =
                new
                {
                    attachment.PatientId,
                    attachment.DoctorId,
                    attachment.OriginalFileName,
                    attachment.ContentType,
                    attachment.SizeBytes,
                    attachment.Category
                };

            _db.PatientAttachments
                .Remove(attachment);

            _audit.Add(
                reviewerUserId,
                "PatientAttachmentDeletedAfterApproval",
                "PatientAttachment",
                attachment.Id.ToString(),
                old,
                new
                {
                    ApprovalRequestId =
                        request.Id
                },
                ipAddress);

            return Success(request.Id);
        }

        return Fail(
            "UNSUPPORTED_APPROVAL_ACTION",
            "Approval action is not supported.");
    }

    private static ApprovalRequestWriteResult Success(
        Guid? requestId)
    {
        return new ApprovalRequestWriteResult(
            true,
            null,
            null,
            requestId);
    }

    private static ApprovalRequestWriteResult Fail(
        string code,
        string message)
    {
        return new ApprovalRequestWriteResult(
            false,
            code,
            message,
            null);
    }

    private static string? CleanOptional(
        string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
