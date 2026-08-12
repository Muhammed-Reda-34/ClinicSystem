namespace ClinicSystem.Infrastructure.Visits;

public sealed record CreateVisitTreatmentCommand(
    Guid DentalServiceId,
    int Quantity,
    IReadOnlyCollection<int> ToothNumbers,
    string? Notes
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
    string? PaymentMethod
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
    decimal LineTotal
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
    DateTime VisitDateUtc
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

public sealed record VisitWriteResult(
    bool Succeeded,
    string? ErrorCode,
    string? ErrorMessage,
    Guid? VisitId
);
