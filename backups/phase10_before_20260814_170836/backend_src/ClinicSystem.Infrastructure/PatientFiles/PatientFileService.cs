using ClinicSystem.Domain.Entities;
using ClinicSystem.Domain.Enums;
using ClinicSystem.Infrastructure.Audit;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.PatientFiles;

public sealed class PatientFileService
{
    public const int MaxAttachmentBytes =
        10 * 1024 * 1024;

    private readonly ClinicDbContext _db;
    private readonly AuditService _audit;

    public PatientFileService(
        ClinicDbContext db,
        AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<IReadOnlyCollection<PatientAttachmentDto>>
        GetAttachmentsAsync(
            Guid patientId,
            IReadOnlyCollection<Guid> allowedDoctorIds,
            CancellationToken cancellationToken)
    {
        if (
            !await CanAccessPatientAsync(
                patientId,
                allowedDoctorIds,
                cancellationToken)
        )
        {
            return [];
        }

        return await _db.PatientAttachments
            .AsNoTracking()
            .Where(
                x =>
                    x.PatientId == patientId
                    && (
                        x.DoctorId == null
                        || allowedDoctorIds
                            .Contains(
                                x.DoctorId.Value)
                    ))
            .OrderByDescending(
                x => x.UploadedAtUtc)
            .Select(
                x => new PatientAttachmentDto(
                    x.Id,
                    x.PatientId,
                    x.DoctorId,
                    x.Category,
                    x.OriginalFileName,
                    x.ContentType,
                    x.SizeBytes,
                    x.Notes,
                    x.UploadedByUserId,
                    x.UploadedAtUtc))
            .ToListAsync(
                cancellationToken);
    }

    public async Task<(bool Ok, string? Error, Guid? Id)>
        AddAttachmentAsync(
            Guid patientId,
            Guid? doctorId,
            PatientAttachmentCategory category,
            string originalFileName,
            string contentType,
            byte[] data,
            string? notes,
            IReadOnlyCollection<Guid> allowedDoctorIds,
            Guid actorUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        if (
            data.Length == 0
            || data.Length > MaxAttachmentBytes
        )
        {
            return (
                false,
                "File size is invalid.",
                null);
        }

        if (
            doctorId is not null
            && !allowedDoctorIds
                .Contains(doctorId.Value)
        )
        {
            return (
                false,
                "Doctor scope is not allowed.",
                null);
        }

        if (
            !await CanAccessPatientAsync(
                patientId,
                allowedDoctorIds,
                cancellationToken)
        )
        {
            return (
                false,
                "Patient was not found.",
                null);
        }

        var safeContentType =
            ValidateContentType(
                contentType,
                data);

        if (safeContentType is null)
        {
            return (
                false,
                "Only PDF, JPEG, PNG and WEBP files are allowed.",
                null);
        }

        var safeFileName =
            Path.GetFileName(
                originalFileName.Trim());

        if (string.IsNullOrWhiteSpace(safeFileName))
        {
            safeFileName = "attachment";
        }

        var attachment =
            new PatientAttachment
            {
                Id = Guid.NewGuid(),
                PatientId = patientId,
                DoctorId = doctorId,
                Category = category,
                OriginalFileName =
                    safeFileName,
                ContentType =
                    safeContentType,
                SizeBytes =
                    data.LongLength,
                Data = data,
                Notes =
                    CleanOptional(notes),
                UploadedByUserId =
                    actorUserId,
                UploadedAtUtc =
                    DateTime.UtcNow
            };

        _db.PatientAttachments
            .Add(attachment);

        _audit.Add(
            actorUserId,
            "PatientAttachmentAdded",
            nameof(PatientAttachment),
            attachment.Id.ToString(),
            null,
            new
            {
                attachment.PatientId,
                attachment.DoctorId,
                attachment.Category,
                attachment.OriginalFileName,
                attachment.ContentType,
                attachment.SizeBytes
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return (
            true,
            null,
            attachment.Id);
    }

    public async Task<PatientAttachmentDownloadDto?>
        DownloadAsync(
            Guid attachmentId,
            IReadOnlyCollection<Guid> allowedDoctorIds,
            CancellationToken cancellationToken)
    {
        var attachment =
            await _db.PatientAttachments
            .AsNoTracking()
            .SingleOrDefaultAsync(
                x =>
                    x.Id == attachmentId
                    && x.Patient.DoctorAssignments
                        .Any(
                            assignment =>
                                allowedDoctorIds
                                .Contains(
                                    assignment.DoctorId))
                    && (
                        x.DoctorId == null
                        || allowedDoctorIds
                            .Contains(
                                x.DoctorId.Value)
                    ),
                cancellationToken);

        if (attachment is null)
        {
            return null;
        }

        return new PatientAttachmentDownloadDto(
            attachment.OriginalFileName,
            attachment.ContentType,
            attachment.Data);
    }

    public async Task<bool> DeleteAttachmentAsync(
        Guid attachmentId,
        IReadOnlyCollection<Guid> allowedDoctorIds,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var attachment =
            await _db.PatientAttachments
            .SingleOrDefaultAsync(
                x =>
                    x.Id == attachmentId
                    && x.Patient.DoctorAssignments
                        .Any(
                            assignment =>
                                allowedDoctorIds
                                .Contains(
                                    assignment.DoctorId))
                    && (
                        x.DoctorId == null
                        || allowedDoctorIds
                            .Contains(
                                x.DoctorId.Value)
                    ),
                cancellationToken);

        if (attachment is null)
        {
            return false;
        }

        var auditSnapshot =
            new
            {
                attachment.PatientId,
                attachment.DoctorId,
                attachment.Category,
                attachment.OriginalFileName,
                attachment.ContentType,
                attachment.SizeBytes
            };

        _db.PatientAttachments
            .Remove(attachment);

        _audit.Add(
            actorUserId,
            "PatientAttachmentDeleted",
            nameof(PatientAttachment),
            attachment.Id.ToString(),
            auditSnapshot,
            null,
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return true;
    }

    public async Task<IReadOnlyCollection<PatientClinicalNoteDto>>
        GetClinicalNotesAsync(
            Guid patientId,
            IReadOnlyCollection<Guid> allowedDoctorIds,
            CancellationToken cancellationToken)
    {
        if (allowedDoctorIds.Count == 0)
        {
            return [];
        }

        return await (
            from note
                in _db.PatientClinicalNotes
                .AsNoTracking()
            join doctor
                in _db.Doctors.AsNoTracking()
                on note.DoctorId equals doctor.Id
            join user
                in _db.Users.AsNoTracking()
                on doctor.UserId equals user.Id
            where note.PatientId == patientId
                && allowedDoctorIds
                    .Contains(note.DoctorId)
            orderby note.CreatedAtUtc descending
            select new PatientClinicalNoteDto(
                note.Id,
                note.PatientId,
                note.DoctorId,
                user.FullName,
                note.NoteText,
                note.CreatedByUserId,
                note.CreatedAtUtc))
            .ToListAsync(
                cancellationToken);
    }

    public async Task<(bool Ok, string? Error, Guid? Id)>
        AddClinicalNoteAsync(
            Guid patientId,
            Guid doctorId,
            string noteText,
            IReadOnlyCollection<Guid> allowedDoctorIds,
            Guid actorUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        if (
            !allowedDoctorIds
            .Contains(doctorId)
        )
        {
            return (
                false,
                "Doctor scope is not allowed.",
                null);
        }

        if (
            string.IsNullOrWhiteSpace(noteText)
            || noteText.Trim().Length > 5000
        )
        {
            return (
                false,
                "Clinical note is invalid.",
                null);
        }

        var patientValid =
            await _db.Patients
            .AsNoTracking()
            .AnyAsync(
                patient =>
                    patient.Id == patientId
                    && patient.DoctorAssignments
                        .Any(
                            assignment =>
                                assignment.DoctorId
                                == doctorId),
                cancellationToken);

        if (!patientValid)
        {
            return (
                false,
                "Patient was not found.",
                null);
        }

        var note =
            new PatientClinicalNote
            {
                Id = Guid.NewGuid(),
                PatientId = patientId,
                DoctorId = doctorId,
                NoteText =
                    noteText.Trim(),
                CreatedByUserId =
                    actorUserId,
                CreatedAtUtc =
                    DateTime.UtcNow
            };

        _db.PatientClinicalNotes.Add(note);

        _audit.Add(
            actorUserId,
            "PatientClinicalNoteAdded",
            nameof(PatientClinicalNote),
            note.Id.ToString(),
            null,
            new
            {
                note.PatientId,
                note.DoctorId,
                note.NoteText
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return (
            true,
            null,
            note.Id);
    }

    private async Task<bool> CanAccessPatientAsync(
        Guid patientId,
        IReadOnlyCollection<Guid> allowedDoctorIds,
        CancellationToken cancellationToken)
    {
        if (allowedDoctorIds.Count == 0)
        {
            return false;
        }

        return await _db.Patients
            .AsNoTracking()
            .AnyAsync(
                patient =>
                    patient.Id == patientId
                    && patient.DoctorAssignments
                        .Any(
                            assignment =>
                                allowedDoctorIds
                                .Contains(
                                    assignment.DoctorId)),
                cancellationToken);
    }

    private static string? ValidateContentType(
        string requestedContentType,
        byte[] data)
    {
        if (
            data.Length >= 4
            && data[0] == 0x25
            && data[1] == 0x50
            && data[2] == 0x44
            && data[3] == 0x46
        )
        {
            return "application/pdf";
        }

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

        _ = requestedContentType;
        return null;
    }

    private static string? CleanOptional(
        string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
