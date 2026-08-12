using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Users;

public sealed class UpdateStaffDoctorsRequest
{
    [MinLength(1)]
    public List<Guid> DoctorIds { get; set; } = [];
}
