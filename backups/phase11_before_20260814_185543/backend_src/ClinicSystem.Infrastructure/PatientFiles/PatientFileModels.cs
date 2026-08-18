using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Infrastructure.PatientFiles;

public sealed record PatientAttachmentDto(
    Guid Id,
    Guid PatientId,
    Guid? DoctorId,
    PatientAttachmentCategory Category,
    string OriginalFileName,
    string ContentType,
    long SizeBytes,
    string? Notes,
    Guid UploadedByUserId,
    DateTime UploadedAtUtc
);

public sealed record PatientAttachmentDownloadDto(
    string OriginalFileName,
    string ContentType,
    byte[] Data
);

public sealed record PatientClinicalNoteDto(
    Guid Id,
    Guid PatientId,
    Guid DoctorId,
    string DoctorName,
    string NoteText,
    Guid CreatedByUserId,
    DateTime CreatedAtUtc
);
