using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Appointments;

public sealed class CreateAppointmentRequest
{
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }

    public DateTime ScheduledAtUtc { get; set; }

    [Range(5, 240)]
    public int DurationMinutes { get; set; } = 30;

    [MaxLength(500)]
    public string? Reason { get; set; }

    [MaxLength(1500)]
    public string? Notes { get; set; }

    public bool AllowBlacklisted { get; set; }
}
