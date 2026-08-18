using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Domain.Entities;

public sealed class Appointment
{
    public Guid Id { get; set; }

    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }

    public DateTime ScheduledAtUtc { get; set; }
    public int DurationMinutes { get; set; } = 30;

    public AppointmentAttendanceStatus AttendanceStatus { get; set; }
        = AppointmentAttendanceStatus.Scheduled;

    public string? Reason { get; set; }
    public string? Notes { get; set; }

    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public Patient Patient { get; set; } = null!;
    public DoctorProfile Doctor { get; set; } = null!;
}
