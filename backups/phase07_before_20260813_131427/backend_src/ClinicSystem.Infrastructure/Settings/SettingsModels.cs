namespace ClinicSystem.Infrastructure.Settings;

public sealed record ClinicSettingDto(
    Guid Id,
    string ClinicName,
    string HeaderInvocationAr,
    string CurrencyCode,
    string AppointmentReminderTemplateAr,
    string AppointmentReminderTemplateEn,
    DateTime UpdatedAtUtc
);

public sealed record UpdateClinicSettingCommand(
    string ClinicName,
    string HeaderInvocationAr,
    string CurrencyCode,
    string AppointmentReminderTemplateAr,
    string AppointmentReminderTemplateEn
);
