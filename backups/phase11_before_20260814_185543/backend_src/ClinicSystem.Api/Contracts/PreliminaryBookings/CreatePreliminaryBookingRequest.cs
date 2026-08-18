namespace ClinicSystem.Api.Contracts.PreliminaryBookings;

public sealed class CreatePreliminaryBookingRequest
{
    public string PatientName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public DateOnly? VisitDate { get; set; }
    public TimeOnly? VisitTime { get; set; }
}
