namespace ClinicSystem.Infrastructure.Context;

public sealed record AccessibleDoctorDto(
    Guid DoctorId,
    string FullName,
    string Specialization,
    bool IsOwner
);
