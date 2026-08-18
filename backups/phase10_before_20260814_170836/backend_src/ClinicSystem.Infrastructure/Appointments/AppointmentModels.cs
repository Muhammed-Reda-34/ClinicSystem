using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Infrastructure.Appointments;

public sealed record AppointmentListItemDto(
    Guid Id,
    Guid PatientId,
    string PatientCode,
    string PatientName,
    string PhoneNumber,
    bool IsBlacklisted,
    int NoShowCount,
    Guid DoctorId,
    string DoctorName,
    DateTime ScheduledAtUtc,
    int DurationMinutes,
    AppointmentAttendanceStatus AttendanceStatus,
    string? Reason,
    string? Notes
);

public sealed record CreateAppointmentCommand(
    Guid PatientId,
    Guid DoctorId,
    DateTime ScheduledAtUtc,
    int DurationMinutes,
    string? Reason,
    string? Notes,
    bool AllowBlacklisted
);

public sealed record AppointmentWriteResult(
    bool Succeeded,
    string? ErrorCode,
    string? ErrorMessage,
    Guid? AppointmentId
);
