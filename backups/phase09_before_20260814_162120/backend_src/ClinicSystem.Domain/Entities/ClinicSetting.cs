namespace ClinicSystem.Domain.Entities;

public sealed class ClinicSetting
{
    public Guid Id { get; set; }

    public string ClinicName { get; set; } = "Blue Dahab";
    public string HeaderInvocationAr { get; set; }
        = "لا حول ولا قوة إلا بالله";

    public string CurrencyCode { get; set; } = "EGP";

    public string AppointmentReminderTemplateAr { get; set; }
        = "مرحبًا، نذكرك بموعدك في العيادة.";

    public string AppointmentReminderTemplateEn { get; set; }
        = "Hello, this is a reminder for your clinic appointment.";

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; set; }
}
