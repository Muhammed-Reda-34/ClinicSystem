using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Infrastructure.Patients;

public sealed record PatientDoctorDto(
    Guid DoctorId,
    string FullName
);

public sealed record PatientListItemDto(
    Guid Id,
    string PatientCode,
    string? FormNumber,
    string FullName,
    string PhoneNumber,
    DateOnly? DateOfBirth,
    int? Age,
    PatientProfileStatus ProfileStatus,
    bool IsBlacklisted,
    int NoShowCount,
    IReadOnlyCollection<PatientDoctorDto> Doctors
);

public sealed record PatientDetailsDto(
    Guid Id,
    string PatientCode,
    string? FormNumber,
    string FullName,
    string PhoneNumber,
    DateOnly? DateOfBirth,
    int? Age,
    string? Gender,
    string? Address,
    string? AdministrativeNotes,
    PatientProfileStatus ProfileStatus,
    bool IsBlacklisted,
    int NoShowCount,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    IReadOnlyCollection<PatientDoctorDto> Doctors
);

public sealed record PagedPatientsDto(
    int Page,
    int PageSize,
    int TotalCount,
    IReadOnlyCollection<PatientListItemDto> Items
);

public sealed record PhoneMatchDto(
    Guid Id,
    string PatientCode,
    string FullName,
    string PhoneNumber,
    bool IsBlacklisted
);

public sealed record PhoneCheckDto(
    bool Exists,
    bool HasHiddenClinicMatch,
    IReadOnlyCollection<PhoneMatchDto> VisibleMatches
);

public sealed record CreatePatientCommand(
    string FullName,
    string PhoneNumber,
    string? FormNumber,
    DateOnly? DateOfBirth,
    string? Gender,
    string? Address,
    string? AdministrativeNotes,
    IReadOnlyCollection<Guid> DoctorIds
);

public sealed record UpdatePatientCommand(
    string FullName,
    string PhoneNumber,
    string? FormNumber,
    DateOnly? DateOfBirth,
    string? Gender,
    string? Address,
    string? AdministrativeNotes,
    bool MarkBasicCompleted,
    IReadOnlyCollection<Guid> DoctorIds
);

public sealed record PatientWriteResult(
    bool Succeeded,
    string? ErrorCode,
    string? ErrorMessage,
    Guid? PatientId
);
