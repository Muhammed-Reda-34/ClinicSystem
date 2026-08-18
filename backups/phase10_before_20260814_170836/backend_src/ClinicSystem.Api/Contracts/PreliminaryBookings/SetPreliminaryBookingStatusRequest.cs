using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Api.Contracts.PreliminaryBookings;

public sealed class SetPreliminaryBookingStatusRequest
{
    public AppointmentAttendanceStatus AttendanceStatus { get; set; }
}
