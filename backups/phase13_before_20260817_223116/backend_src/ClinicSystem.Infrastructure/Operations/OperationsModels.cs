namespace ClinicSystem.Infrastructure.Operations;

public sealed record VisitBrowseItemDto(
    Guid VisitId,
    Guid PatientId,
    string PatientCode,
    string PatientName,
    string PhoneNumber,
    Guid DoctorId,
    string DoctorName,
    DateTime VisitDateUtc,
    string TreatmentSummary,
    string TeethSummary,
    decimal Total,
    decimal Paid,
    decimal Remaining,
    DateTime? FollowUpAtUtc
);

public sealed record RescheduleAppointmentCommand(
    DateTime ScheduledAtUtc,
    int DurationMinutes,
    string? Notes
);

public sealed record OperationResult(
    bool Succeeded,
    string? ErrorCode,
    string? ErrorMessage
);
