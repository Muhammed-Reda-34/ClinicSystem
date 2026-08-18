using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Domain.Entities;

public sealed class PreliminaryBooking
{
    public Guid Id { get; set; }

    public Guid? PatientId { get; set; }
    public Patient? Patient { get; set; }

    public string PatientName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;

    public DateOnly? VisitDate { get; set; }
    public TimeOnly? VisitTime { get; set; }

    public AppointmentAttendanceStatus AttendanceStatus { get; set; }
        = AppointmentAttendanceStatus.Scheduled;

    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
