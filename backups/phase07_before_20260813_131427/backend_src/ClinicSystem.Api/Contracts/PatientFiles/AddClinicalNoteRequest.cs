using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.PatientFiles;

public sealed class AddClinicalNoteRequest
{
    public Guid DoctorId { get; set; }

    [Required, MaxLength(5000)]
    public string NoteText { get; set; } = string.Empty;
}
