using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Api.Contracts.Appointments;

public sealed class SetAppointmentAttendanceRequest
{
    public AppointmentAttendanceStatus AttendanceStatus { get; set; }
}
