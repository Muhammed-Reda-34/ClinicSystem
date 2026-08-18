using ClinicSystem.Api.Common;
using ClinicSystem.Api.Contracts.Medical;
using ClinicSystem.Infrastructure.Context;
using ClinicSystem.Infrastructure.MedicalRecords;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/patients/{patientId:guid}/medical-intake")]
[Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
[EnableRateLimiting("api")]
public sealed class PatientMedicalController : ControllerBase
{
    private readonly PatientMedicalService _medical;
    private readonly DoctorScopeService _doctorScope;

    public PatientMedicalController(
        PatientMedicalService medical,
        DoctorScopeService doctorScope)
    {
        _medical = medical;
        _doctorScope = doctorScope;
    }

    [HttpGet]
    public async Task<IActionResult> Get(
        Guid patientId,
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(cancellationToken);

        var result = await _medical.GetAsync(
            patientId,
            scope,
            cancellationToken);

        return result is null
            ? NotFound()
            : Ok(result);
    }

    [HttpPut]
    public async Task<IActionResult> Update(
        Guid patientId,
        UpdatePatientMedicalIntakeRequest request,
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(cancellationToken);

        try
        {
            var updated = await _medical.UpdateAsync(
                patientId,
                new UpdatePatientMedicalIntakeCommand(
                    request.FullName,
                    request.PhoneNumber,
                    request.AlternatePhone,
                    request.DateOfBirth,
                    request.Gender,
                    request.MaritalStatus,
                    request.Occupation,
                    request.Address,
                    request.HasDrugAllergy,
                    request.DrugAllergyDetails,
                    request.HasHypertension,
                    request.HasRheumaticFever,
                    request.HasBloodDisease,
                    request.HasLiverDisease,
                    request.HasHepatitis,
                    request.HasDiabetes,
                    request.HasHeartDisease,
                    request.HasKidneyDisease,
                    request.HasThyroidDisease,
                    request.HasCancer,
                    request.OtherConditions,
                    request.HadRecentHospitalization,
                    request.RecentHospitalizationReason,
                    request.MedicalNotes,
                    request.PatientSignatureName,
                    request.FormDate),
                scope,
                User.GetUserIdOrThrow(),
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                cancellationToken);

            return updated
                ? NoContent()
                : NotFound();
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new
            {
                message = exception.Message
            });
        }
    }

    private async Task<IReadOnlyCollection<Guid>> ResolveScopeAsync(
        CancellationToken cancellationToken)
    {
        Guid? requestedDoctorId = null;

        if (
            Request.Headers.TryGetValue("X-Doctor-Id", out var value)
            && Guid.TryParse(value.FirstOrDefault(), out var parsed)
        )
        {
            requestedDoctorId = parsed;
        }

        return await _doctorScope.ResolveDoctorIdsAsync(
            User.GetUserIdOrThrow(),
            User.GetRoles(),
            requestedDoctorId,
            cancellationToken);
    }
}
