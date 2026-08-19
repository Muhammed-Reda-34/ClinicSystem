namespace ClinicSystem.Infrastructure.Visits;

public sealed record CreateVisitTreatmentCommand(
    Guid DentalServiceId,
    int Quantity,
    IReadOnlyCollection<int> ToothNumbers,
    string? Notes,
    bool CompletesTreatmentCase
);

public sealed record CreateVisitCommand(
    Guid PatientId,
    Guid DoctorId,
    Guid? AppointmentId,
    DateTime VisitDateUtc,
    string? ClinicalNotes,
    decimal DiscountAmount,
    decimal ExtraAmount,
    string? ExtraReason,
    DateTime? FollowUpAtUtc,
    IReadOnlyCollection<CreateVisitTreatmentCommand> Treatments,
    decimal InitialPayment,
    string? PaymentMethod,
    string? InitialPaymentNotes,
    bool IsHistoricalEntry
);

public sealed record UpdateVisitTreatmentCommand(
    Guid? TreatmentItemId,
    Guid DentalServiceId,
    int Quantity,
    IReadOnlyCollection<int> ToothNumbers,
    string? Notes,
    bool CompletesTreatmentCase
);

public sealed record UpdateVisitCommand(
    DateTime VisitDateUtc,
    string? ClinicalNotes,
    decimal DiscountAmount,
    decimal ExtraAmount,
    string? ExtraReason,
    DateTime? FollowUpAtUtc,
    IReadOnlyCollection<UpdateVisitTreatmentCommand> Treatments,
    bool IsHistoricalEntry
);

public sealed record CreateTreatmentSessionCommand(
    DateTime VisitDateUtc,
    string? SessionNotes,
    string? ClinicalNotes,
    DateTime? FollowUpAtUtc,
    bool CompletesTreatmentCase,
    bool IsHistoricalEntry
);

public sealed record VisitTreatmentDto(
    Guid Id,
    Guid? DentalServiceId,
    string ServiceNameAr,
    string? ServiceNameEn,
    decimal UnitPrice,
    int Quantity,
    IReadOnlyCollection<int> ToothNumbers,
    string? Notes,
    decimal LineTotal,
    Guid TreatmentCaseId,
    int SessionNumber,
    int CaseSessionCount,
    bool IsLatestSession,
    bool CaseCompleted,
    bool CompletesTreatmentCase
);

public sealed record PaymentDto(
    Guid Id,
    decimal Amount,
    string? Method,
    string? Notes,
    DateTime PaidAtUtc
);

public sealed record PatientVisitDto(
    Guid Id,
    Guid PatientId,
    string PatientCode,
    string PatientName,
    Guid DoctorId,
    string DoctorName,
    DateTime VisitDateUtc,
    string? ClinicalNotes,
    decimal Subtotal,
    decimal DiscountAmount,
    decimal ExtraAmount,
    string? ExtraReason,
    decimal Total,
    decimal Paid,
    decimal Remaining,
    DateTime? FollowUpAtUtc,
    DateTime? FollowUpCompletedAtUtc,
    IReadOnlyCollection<VisitTreatmentDto> Treatments,
    IReadOnlyCollection<PaymentDto> Payments
);

public sealed record FollowUpVisitDto(
    Guid VisitId,
    Guid PatientId,
    string PatientCode,
    string PatientName,
    string PhoneNumber,
    Guid DoctorId,
    string DoctorName,
    DateTime FollowUpAtUtc,
    DateTime VisitDateUtc,
    DateTime? FollowUpCompletedAtUtc
);

public sealed record DebtVisitDto(
    Guid VisitId,
    Guid PatientId,
    string PatientCode,
    string PatientName,
    string PhoneNumber,
    Guid DoctorId,
    string DoctorName,
    DateTime VisitDateUtc,
    decimal Total,
    decimal Paid,
    decimal Remaining
);

public sealed record RescheduleFollowUpCommand(
    DateTime FollowUpAtUtc,
    string? Reason
);

public sealed record VisitWriteResult(
    bool Succeeded,
    string? ErrorCode,
    string? ErrorMessage,
    Guid? VisitId
);
