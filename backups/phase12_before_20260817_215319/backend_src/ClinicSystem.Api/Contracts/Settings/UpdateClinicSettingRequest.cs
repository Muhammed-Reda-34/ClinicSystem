using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Settings;

public sealed class UpdateClinicSettingRequest
{
    [Required, MaxLength(200)]
    public string ClinicName { get; set; } = "Blue Dahab";

    [Required, MaxLength(300)]
    public string HeaderInvocationAr { get; set; }
        = "لا حول ولا قوة إلا بالله";

    [Required, MaxLength(10)]
    public string CurrencyCode { get; set; } = "EGP";

    [Required, MaxLength(1000)]
    public string AppointmentReminderTemplateAr { get; set; }
        = string.Empty;

    [Required, MaxLength(1000)]
    public string AppointmentReminderTemplateEn { get; set; }
        = string.Empty;
}
