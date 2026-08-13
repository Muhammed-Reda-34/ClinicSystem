using ClinicSystem.Domain.Entities;
using ClinicSystem.Domain.Enums;
using ClinicSystem.Infrastructure.Audit;
using ClinicSystem.Infrastructure.Common;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.MedicalRecords;

public sealed class PatientMedicalService
{
    private readonly ClinicDbContext _db;
    private readonly AuditService _audit;

    public PatientMedicalService(
        ClinicDbContext db,
        AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<PatientMedicalIntakeDto?> GetAsync(
        Guid patientId,
        IReadOnlyCollection<Guid> allowedDoctorIds,
        CancellationToken cancellationToken)
    {
        if (allowedDoctorIds.Count == 0)
        {
            return null;
        }

        var row = await _db.Patients
            .AsNoTracking()
            .Where(patient =>
                patient.Id == patientId
                && !patient.IsArchived
                && patient.DoctorAssignments.Any(
                    assignment =>
                        allowedDoctorIds.Contains(
                            assignment.DoctorId)))
            .Select(patient => new
            {
                Patient = patient,
                Medical = patient.MedicalProfile
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (row is null)
        {
            return null;
        }

        var medical = row.Medical;

        return new PatientMedicalIntakeDto(
            row.Patient.Id,
            row.Patient.FullName,
            row.Patient.PhoneNumber,
            row.Patient.AlternatePhone,
            row.Patient.DateOfBirth,
            row.Patient.Gender,
            row.Patient.MaritalStatus,
            row.Patient.Occupation,
            row.Patient.Address,
            medical?.HasDrugAllergy ?? false,
            medical?.DrugAllergyDetails,
            medical?.HasHypertension ?? false,
            medical?.HasRheumaticFever ?? false,
            medical?.HasBloodDisease ?? false,
            medical?.HasLiverDisease ?? false,
            medical?.HasHepatitis ?? false,
            medical?.HasDiabetes ?? false,
            medical?.HasHeartDisease ?? false,
            medical?.HasKidneyDisease ?? false,
            medical?.HasThyroidDisease ?? false,
            medical?.HasCancer ?? false,
            medical?.OtherConditions,
            medical?.HadRecentHospitalization ?? false,
            medical?.RecentHospitalizationReason,
            medical?.MedicalNotes,
            medical?.PatientSignatureName,
            medical?.FormDate,
            medical?.UpdatedAtUtc);
    }

    public async Task<bool> UpdateAsync(
        Guid patientId,
        UpdatePatientMedicalIntakeCommand command,
        IReadOnlyCollection<Guid> allowedDoctorIds,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        if (allowedDoctorIds.Count == 0)
        {
            return false;
        }

        var patient = await _db.Patients
            .Include(x => x.MedicalProfile)
            .Include(x => x.DoctorAssignments)
            .SingleOrDefaultAsync(
                x =>
                    x.Id == patientId
                    && !x.IsArchived
                    && x.DoctorAssignments.Any(
                        assignment =>
                            allowedDoctorIds.Contains(
                                assignment.DoctorId)),
                cancellationToken);

        if (patient is null)
        {
            return false;
        }

        if (
            command.DateOfBirth is not null
            && command.DateOfBirth.Value
                > DateOnly.FromDateTime(DateTime.UtcNow)
        )
        {
            throw new InvalidOperationException(
                "Date of birth cannot be in the future.");
        }

        var phoneParse =
            PhoneNumberNormalizer.Parse(
                command.PhoneNumber);

        if (!phoneParse.IsValid)
        {
            throw new InvalidOperationException(
                phoneParse.ErrorMessage
                ?? "Phone number is invalid.");
        }

        var normalizedPhone =
            phoneParse.E164 is not null
                ? PhoneNumberNormalizer.ExtractDigits(
                    phoneParse.E164)
                : phoneParse.Digits;

        var normalizedName =
            TextNormalizer.NormalizeName(
                command.FullName);

        var phoneCandidates =
            PhoneNumberNormalizer
            .GetCandidates(
                command.PhoneNumber)
            .ToArray();

        var duplicateExists =
            await _db.Patients
                .AsNoTracking()
                .AnyAsync(
                    x =>
                        x.Id != patientId
                        && phoneCandidates
                            .Contains(
                                x.NormalizedPhone)
                        && x.NormalizedFullName
                        == normalizedName,
                    cancellationToken);

        if (duplicateExists)
        {
            throw new InvalidOperationException(
                "A patient with the same name and phone already exists.");
        }

        var before = new
        {
            patient.FullName,
            patient.PhoneNumber,
            patient.AlternatePhone,
            patient.DateOfBirth,
            patient.Gender,
            patient.MaritalStatus,
            patient.Occupation,
            patient.Address,
            Medical = patient.MedicalProfile is null
                ? null
                : new
                {
                    patient.MedicalProfile.HasDrugAllergy,
                    patient.MedicalProfile.DrugAllergyDetails,
                    patient.MedicalProfile.HasHypertension,
                    patient.MedicalProfile.HasRheumaticFever,
                    patient.MedicalProfile.HasBloodDisease,
                    patient.MedicalProfile.HasLiverDisease,
                    patient.MedicalProfile.HasHepatitis,
                    patient.MedicalProfile.HasDiabetes,
                    patient.MedicalProfile.HasHeartDisease,
                    patient.MedicalProfile.HasKidneyDisease,
                    patient.MedicalProfile.HasThyroidDisease,
                    patient.MedicalProfile.HasCancer,
                    patient.MedicalProfile.OtherConditions,
                    patient.MedicalProfile.HadRecentHospitalization,
                    patient.MedicalProfile.RecentHospitalizationReason,
                    patient.MedicalProfile.MedicalNotes,
                    patient.MedicalProfile.PatientSignatureName,
                    patient.MedicalProfile.FormDate
                }
        };

        patient.FullName = command.FullName.Trim();
        patient.NormalizedFullName =
            normalizedName;

        patient.PhoneNumber = command.PhoneNumber.Trim();
        patient.NormalizedPhone = normalizedPhone;
        patient.PhoneCountryIso2 =
            phoneParse.CountryIso2;
        patient.PhoneE164 =
            phoneParse.E164;

        if (
            !string.IsNullOrWhiteSpace(
                command.AlternatePhone)
        )
        {
            var alternateParse =
                PhoneNumberNormalizer.Parse(
                    command.AlternatePhone);

            if (!alternateParse.IsValid)
            {
                throw new InvalidOperationException(
                    alternateParse.ErrorMessage
                    ?? "Alternate phone number is invalid.");
            }
        }

        patient.AlternatePhone =
            CleanOptional(command.AlternatePhone);

        patient.DateOfBirth = command.DateOfBirth;
        patient.Gender = CleanOptional(command.Gender);
        patient.MaritalStatus =
            CleanOptional(command.MaritalStatus);
        patient.Occupation =
            CleanOptional(command.Occupation);
        patient.Address = CleanOptional(command.Address);

        patient.ProfileStatus =
            PatientProfileStatus.MedicalCompleted;
        patient.UpdatedAtUtc = DateTime.UtcNow;

        var medical =
            patient.MedicalProfile
            ?? new PatientMedicalProfile
            {
                PatientId = patient.Id
            };

        medical.HasDrugAllergy = command.HasDrugAllergy;
        medical.DrugAllergyDetails =
            command.HasDrugAllergy
                ? CleanOptional(command.DrugAllergyDetails)
                : null;

        medical.HasHypertension = command.HasHypertension;
        medical.HasRheumaticFever = command.HasRheumaticFever;
        medical.HasBloodDisease = command.HasBloodDisease;
        medical.HasLiverDisease = command.HasLiverDisease;
        medical.HasHepatitis = command.HasHepatitis;
        medical.HasDiabetes = command.HasDiabetes;
        medical.HasHeartDisease = command.HasHeartDisease;
        medical.HasKidneyDisease = command.HasKidneyDisease;
        medical.HasThyroidDisease = command.HasThyroidDisease;
        medical.HasCancer = command.HasCancer;
        medical.OtherConditions =
            CleanOptional(command.OtherConditions);

        medical.HadRecentHospitalization =
            command.HadRecentHospitalization;
        medical.RecentHospitalizationReason =
            command.HadRecentHospitalization
                ? CleanOptional(
                    command.RecentHospitalizationReason)
                : null;

        medical.MedicalNotes =
            CleanOptional(command.MedicalNotes);
        medical.PatientSignatureName =
            CleanOptional(command.PatientSignatureName);
        medical.FormDate = command.FormDate;
        medical.UpdatedByUserId = actorUserId;
        medical.UpdatedAtUtc = DateTime.UtcNow;

        if (patient.MedicalProfile is null)
        {
            _db.PatientMedicalProfiles.Add(medical);
            patient.MedicalProfile = medical;
        }

        _audit.Add(
            actorUserId,
            "PatientMedicalIntakeUpdated",
            nameof(Patient),
            patient.Id.ToString(),
            before,
            new
            {
                patient.FullName,
                patient.PhoneNumber,
                patient.AlternatePhone,
                patient.DateOfBirth,
                patient.Gender,
                patient.MaritalStatus,
                patient.Occupation,
                patient.Address,
                medical.HasDrugAllergy,
                medical.DrugAllergyDetails,
                medical.HasHypertension,
                medical.HasRheumaticFever,
                medical.HasBloodDisease,
                medical.HasLiverDisease,
                medical.HasHepatitis,
                medical.HasDiabetes,
                medical.HasHeartDisease,
                medical.HasKidneyDisease,
                medical.HasThyroidDisease,
                medical.HasCancer,
                medical.OtherConditions,
                medical.HadRecentHospitalization,
                medical.RecentHospitalizationReason,
                medical.MedicalNotes,
                medical.PatientSignatureName,
                medical.FormDate
            },
            ipAddress);

        await _db.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static string? CleanOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
