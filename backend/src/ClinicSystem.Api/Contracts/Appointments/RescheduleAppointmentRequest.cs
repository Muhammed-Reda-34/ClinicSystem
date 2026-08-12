using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Appointments;

public sealed class RescheduleAppointmentRequest
{
    public DateTime ScheduledAtUtc { get; set; }

    [Range(5, 240)]
    public int DurationMinutes { get; set; } = 30;

    [MaxLength(1500)]
    public string? Notes { get; set; }
}
