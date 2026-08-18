using ClinicSystem.Api.Common;
using ClinicSystem.Api.Contracts.Patients;
using ClinicSystem.Application.Common.Security;
using ClinicSystem.Infrastructure.Context;
using ClinicSystem.Infrastructure.Patients;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/patients")]
[EnableRateLimiting("api")]
public sealed class PatientsController
    : ControllerBase
{
    private readonly PatientService _patients;
    private readonly DoctorScopeService
        _doctorScope;

    public PatientsController(
        PatientService patients,
        DoctorScopeService doctorScope)
    {
        _patients = patients;
        _doctorScope = doctorScope;
    }

    [HttpGet]
    [Authorize(
        Policy =
            AuthorizationPolicies
            .PatientRead)]
    public async Task<IActionResult> Search(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool? blacklisted = null,
        CancellationToken cancellationToken =
            default)
    {
        var doctorIds =
            await ResolveScopeAsync(
                cancellationToken);

        return Ok(
            await _patients.SearchAsync(
                doctorIds,
                search,
                page,
                pageSize,
                blacklisted,
                cancellationToken));
    }

    [HttpGet("{patientId:guid}")]
    [Authorize(
        Policy =
            AuthorizationPolicies
            .PatientRead)]
    public async Task<IActionResult> Get(
        Guid patientId,
        CancellationToken cancellationToken)
    {
        var doctorIds =
            await ResolveScopeAsync(
                cancellationToken);

        var patient =
            await _patients.GetByIdAsync(
                patientId,
                doctorIds,
                cancellationToken);

        return patient is null
            ? NotFound()
            : Ok(patient);
    }

    [HttpGet("check-phone")]
    [Authorize(
        Policy =
            AuthorizationPolicies
            .PatientRegister)]
    public async Task<IActionResult>
        CheckPhone(
            [FromQuery] string phone,
            CancellationToken cancellationToken)
    {
        var doctorIds =
            await ResolveScopeAsync(
                cancellationToken);

        return Ok(
            await _patients
            .CheckPhoneAsync(
                phone,
                doctorIds,
                cancellationToken));
    }

    [HttpPost]
    [Authorize(
        Policy =
            AuthorizationPolicies
            .PatientRegister)]
    public async Task<IActionResult> Create(
        CreatePatientRequest request,
        CancellationToken cancellationToken)
    {
        var userId =
            User.GetUserIdOrThrow();

        var roles =
            User.GetRoles();

        var requestedDoctorIds =
            request.DoctorIds
            .Distinct()
            .ToArray();

        if (
            !await _doctorScope
                .CanAccessAllAsync(
                    userId,
                    roles,
                    requestedDoctorIds,
                    cancellationToken)
        )
        {
            return Forbid();
        }

        var result =
            await _patients.CreateAsync(
                new CreatePatientCommand(
                    request.FullName,
                    request.PhoneNumber,
                    request.FormNumber,
                    request.DateOfBirth,
                    request.Gender,
                    request.Address,
                    request.AdministrativeNotes,
                    requestedDoctorIds),
                userId,
                HttpContext
                    .Connection
                    .RemoteIpAddress?
                    .ToString(),
                cancellationToken);

        if (!result.Succeeded)
        {
            return result.ErrorCode
                is "FORM_NUMBER_EXISTS"
                or "POTENTIAL_DUPLICATE"
                ? Conflict(
                    new
                    {
                        code =
                            result.ErrorCode,
                        message =
                            result.ErrorMessage
                    })
                : BadRequest(
                    new
                    {
                        code =
                            result.ErrorCode,
                        message =
                            result.ErrorMessage
                    });
        }

        return Created(
            $"/api/v1/patients/{result.PatientId}",
            new
            {
                patientId =
                    result.PatientId
            });
    }

    [HttpPut("{patientId:guid}")]
    [Authorize(
        Policy =
            AuthorizationPolicies
            .PatientEdit)]
    public async Task<IActionResult> Update(
        Guid patientId,
        UpdatePatientRequest request,
        CancellationToken cancellationToken)
    {
        var userId =
            User.GetUserIdOrThrow();

        var roles =
            User.GetRoles();

        var scopeIds =
            await ResolveScopeAsync(
                cancellationToken);

        var requestedDoctorIds =
            request.DoctorIds
            .Distinct()
            .ToArray();

        if (
            !await _doctorScope
                .CanAccessAllAsync(
                    userId,
                    roles,
                    requestedDoctorIds,
                    cancellationToken)
        )
        {
            return Forbid();
        }

        var result =
            await _patients.UpdateAsync(
                patientId,
                new UpdatePatientCommand(
                    request.FullName,
                    request.PhoneNumber,
                    request.FormNumber,
                    request.DateOfBirth,
                    request.Gender,
                    request.Address,
                    request.AdministrativeNotes,
                    request.MarkBasicCompleted,
                    requestedDoctorIds),
                scopeIds,
                userId,
                HttpContext
                    .Connection
                    .RemoteIpAddress?
                    .ToString(),
                cancellationToken);

        if (!result.Succeeded)
        {
            return result.ErrorCode
                == "NOT_FOUND"
                ? NotFound()
                : result.ErrorCode
                    == "FORM_NUMBER_EXISTS"
                    ? Conflict(
                        new
                        {
                            code =
                                result.ErrorCode,
                            message =
                                result.ErrorMessage
                        })
                    : BadRequest(
                        new
                        {
                            code =
                                result.ErrorCode,
                            message =
                                result.ErrorMessage
                        });
        }

        return NoContent();
    }

    private async Task<
        IReadOnlyCollection<Guid>>
        ResolveScopeAsync(
            CancellationToken cancellationToken)
    {
        Guid? requestedDoctorId = null;

        if (
            Request.Headers.TryGetValue(
                "X-Doctor-Id",
                out var value)
            && Guid.TryParse(
                value.FirstOrDefault(),
                out var parsed)
        )
        {
            requestedDoctorId =
                parsed;
        }

        return await _doctorScope
            .ResolveDoctorIdsAsync(
                User.GetUserIdOrThrow(),
                User.GetRoles(),
                requestedDoctorId,
                cancellationToken);
    }
}
