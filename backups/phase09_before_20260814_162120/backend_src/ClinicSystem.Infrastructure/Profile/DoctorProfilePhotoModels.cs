namespace ClinicSystem.Infrastructure.Profile;

public sealed record DoctorProfilePhotoDto(
    bool HasPhoto,
    string? ContentType,
    string? Base64Data,
    DateTime? UpdatedAtUtc
);

public sealed record DoctorProfilePhotoWriteResult(
    bool Succeeded,
    string? ErrorCode,
    string? ErrorMessage
);
