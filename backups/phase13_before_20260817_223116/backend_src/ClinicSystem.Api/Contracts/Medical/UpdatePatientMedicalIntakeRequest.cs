using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Medical;

public sealed class UpdatePatientMedicalIntakeRequest
{
    [Required]
    [MaxLength(250)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string PhoneNumber { get; set; } = string.Empty;

    [MaxLength(30)]
    public string? AlternatePhone { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    [MaxLength(30)]
    public string? Gender { get; set; }

    [MaxLength(80)]
    public string? MaritalStatus { get; set; }

    [MaxLength(150)]
    public string? Occupation { get; set; }

    [MaxLength(600)]
    public string? Address { get; set; }

    public bool HasDrugAllergy { get; set; }

    [MaxLength(1000)]
    public string? DrugAllergyDetails { get; set; }

    public bool HasHypertension { get; set; }
    public bool HasRheumaticFever { get; set; }
    public bool HasBloodDisease { get; set; }
    public bool HasLiverDisease { get; set; }
    public bool HasHepatitis { get; set; }
    public bool HasDiabetes { get; set; }
    public bool HasHeartDisease { get; set; }
    public bool HasKidneyDisease { get; set; }
    public bool HasThyroidDisease { get; set; }
    public bool HasCancer { get; set; }

    [MaxLength(1500)]
    public string? OtherConditions { get; set; }

    public bool HadRecentHospitalization { get; set; }

    [MaxLength(1500)]
    public string? RecentHospitalizationReason { get; set; }

    [MaxLength(3000)]
    public string? MedicalNotes { get; set; }

    [MaxLength(250)]
    public string? PatientSignatureName { get; set; }

    public DateOnly? FormDate { get; set; }
}
