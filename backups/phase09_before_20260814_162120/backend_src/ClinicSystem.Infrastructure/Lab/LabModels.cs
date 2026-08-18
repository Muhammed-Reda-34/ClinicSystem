namespace ClinicSystem.Infrastructure.Lab;

public sealed record LabPatientLookupVisitDto(
    Guid VisitId,
    DateTime VisitDateUtc,
    Guid DoctorId,
    string DoctorName
);

public sealed record LabPatientLookupDto(
    Guid PatientId,
    string PatientCode,
    string? FormNumber,
    string FullName,
    string PhoneNumber,
    DateOnly? DateOfBirth,
    int? Age,
    string? Gender,
    string? Address,
    bool IsBlacklisted,
    IReadOnlyCollection<LabPatientLookupVisitDto> RecentVisits
);

public sealed record CreateLabOrderCommand(
    Guid PatientId,
    Guid DoctorId,
    Guid? VisitId,
    string? CaseDescription,
    IReadOnlyCollection<string> WorkTypes,
    IReadOnlyCollection<int> ToothNumbers,
    IReadOnlyCollection<string> MaterialOptions,
    string? Shade,
    bool DigitalPhotosSent,
    string? ValueLevel,
    string? OcclusalStaining,
    string? Instructions
);

public sealed record LabOrderDto(
    Guid Id,
    string SerialNumber,
    Guid PatientId,
    string PatientCode,
    string PatientName,
    Guid DoctorId,
    string DoctorName,
    Guid? VisitId,
    DateTime? VisitDateUtc,
    string? CaseDescription,
    IReadOnlyCollection<string> WorkTypes,
    IReadOnlyCollection<int> ToothNumbers,
    IReadOnlyCollection<string> MaterialOptions,
    string? Shade,
    bool DigitalPhotosSent,
    string? ValueLevel,
    string? OcclusalStaining,
    string? Instructions,
    DateTime CreatedAtUtc
);

public sealed record CreateLabExpenseCommand(
    Guid PatientId,
    Guid DoctorId,
    Guid? VisitId,
    Guid? LabOrderId,
    string ServiceOrItemName,
    decimal Amount,
    DateTime ExpenseDateUtc,
    string? Notes
);

public sealed record LabExpenseDto(
    Guid Id,
    Guid PatientId,
    string PatientCode,
    string PatientName,
    Guid DoctorId,
    string DoctorName,
    Guid? VisitId,
    DateTime? VisitDateUtc,
    Guid? LabOrderId,
    string ServiceOrItemName,
    decimal Amount,
    DateTime ExpenseDateUtc,
    string? Notes,
    Guid CreatedByUserId,
    DateTime CreatedAtUtc
);

public sealed record LabWriteResult(
    bool Succeeded,
    string? ErrorCode,
    string? ErrorMessage,
    Guid? Id
);
