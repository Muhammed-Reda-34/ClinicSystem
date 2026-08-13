namespace ClinicSystem.Domain.Entities;

public sealed class PatientMedicalProfile
{
    public Guid PatientId { get; set; }

    public bool HasDrugAllergy { get; set; }
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

    public string? OtherConditions { get; set; }

    public bool HadRecentHospitalization { get; set; }
    public string? RecentHospitalizationReason { get; set; }

    public string? MedicalNotes { get; set; }
    public string? PatientSignatureName { get; set; }
    public DateOnly? FormDate { get; set; }

    public Guid UpdatedByUserId { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public Patient Patient { get; set; } = null!;
}
