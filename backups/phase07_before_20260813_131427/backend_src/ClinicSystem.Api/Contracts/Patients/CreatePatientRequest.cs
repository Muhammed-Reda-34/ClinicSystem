using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Patients;

public sealed class CreatePatientRequest
{
    [Required]
    [MaxLength(250)]
    public string FullName { get; set; }
        = string.Empty;

    [Required]
    [MaxLength(30)]
    public string PhoneNumber { get; set; }
        = string.Empty;

    [MaxLength(80)]
    public string? FormNumber { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    [MaxLength(30)]
    public string? Gender { get; set; }

    [MaxLength(600)]
    public string? Address { get; set; }

    [MaxLength(2000)]
    public string? AdministrativeNotes
        { get; set; }

    [MinLength(1)]
    public List<Guid> DoctorIds { get; set; }
        = [];
}
