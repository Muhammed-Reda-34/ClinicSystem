using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Domain.Entities;

public sealed class Patient
{
    public Guid Id { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string? FormNumber { get; set; }

    public string FullName { get; set; } = string.Empty;
    public string NormalizedFullName { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;
    public string NormalizedPhone { get; set; } = string.Empty;
    public string? AlternatePhone { get; set; }

    public DateOnly? DateOfBirth { get; set; }
    public string? Gender { get; set; }

    public string? MaritalStatus { get; set; }
    public string? Occupation { get; set; }
    public string? Address { get; set; }

    public string? AdministrativeNotes { get; set; }

    public PatientProfileStatus ProfileStatus { get; set; }
        = PatientProfileStatus.PreRegistered;

    public int NoShowCount { get; set; }
    public bool IsBlacklisted { get; set; }
    public DateTime? BlacklistedAtUtc { get; set; }
    public DateTime? BlacklistClearedAtUtc { get; set; }

    public bool IsArchived { get; set; }
    public DateTime? ArchivedAtUtc { get; set; }
    public Guid? ArchivedByUserId { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public PatientMedicalProfile? MedicalProfile { get; set; }

    public ICollection<PatientDoctorAssignment> DoctorAssignments { get; set; }
        = new List<PatientDoctorAssignment>();

    public ICollection<Appointment> Appointments { get; set; }
        = new List<Appointment>();

    public ICollection<PatientVisit> Visits { get; set; }
        = new List<PatientVisit>();
}
