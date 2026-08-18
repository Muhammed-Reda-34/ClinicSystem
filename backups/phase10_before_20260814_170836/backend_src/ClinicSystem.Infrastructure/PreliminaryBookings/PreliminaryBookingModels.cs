using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Infrastructure.PreliminaryBookings;

public sealed record PreliminaryBookingDto(
    Guid Id,
    string PatientName,
    string PhoneNumber,
    DateOnly? VisitDate,
    TimeOnly? VisitTime,
    AppointmentAttendanceStatus AttendanceStatus,
    Guid CreatedByUserId,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc
);

public sealed record CreatePreliminaryBookingCommand(
    string PatientName,
    string PhoneNumber,
    DateOnly? VisitDate,
    TimeOnly? VisitTime
);

public sealed record PreliminaryBookingWriteResult(
    bool Succeeded,
    string? ErrorCode,
    string? ErrorMessage,
    Guid? BookingId
);
