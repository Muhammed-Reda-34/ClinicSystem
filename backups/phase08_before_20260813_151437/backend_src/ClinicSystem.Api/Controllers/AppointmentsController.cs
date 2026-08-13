using ClinicSystem.Api.Common;
using ClinicSystem.Api.Contracts.Appointments;
using ClinicSystem.Infrastructure.Appointments;
using ClinicSystem.Infrastructure.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/appointments")]
[Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
[EnableRateLimiting("api")]
public sealed class AppointmentsController : ControllerBase
{
    private readonly AppointmentService _appointments;
    private readonly DoctorScopeService _doctorScope;

    public AppointmentsController(
        AppointmentService appointments,
        DoctorScopeService doctorScope)
    {
        _appointments = appointments;
        _doctorScope = doctorScope;
    }

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] DateTime fromUtc,
        [FromQuery] DateTime toUtc,
        CancellationToken cancellationToken)
    {
        if (toUtc <= fromUtc)
        {
            return BadRequest(new
            {
                message = "toUtc must be after fromUtc."
            });
        }

        var scope = await ResolveScopeAsync(cancellationToken);

        return Ok(
            await _appointments.GetAsync(
                scope,
                fromUtc,
                toUtc,
                cancellationToken));
    }

    [HttpGet("patient/{patientId:guid}")]
    public async Task<IActionResult> GetForPatient(
        Guid patientId,
        CancellationToken cancellationToken)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        return Ok(
            await _appointments.GetForPatientAsync(
                patientId,
                scope,
                cancellationToken));
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        CreateAppointmentRequest request,
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(cancellationToken);

        var result = await _appointments.CreateAsync(
            new CreateAppointmentCommand(
                request.PatientId,
                request.DoctorId,
                request.ScheduledAtUtc,
                request.DurationMinutes,
                request.Reason,
                request.Notes,
                request.AllowBlacklisted),
            scope,
            User.GetUserIdOrThrow(),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);

        if (!result.Succeeded)
        {
            return result.ErrorCode switch
            {
                "BLACKLISTED_PATIENT" => Conflict(new
                {
                    code = result.ErrorCode,
                    message = result.ErrorMessage
                }),
                "DOCTOR_TIME_COLLISION" => Conflict(new
                {
                    code = result.ErrorCode,
                    message = result.ErrorMessage
                }),
                "PATIENT_NOT_FOUND" => NotFound(new
                {
                    code = result.ErrorCode,
                    message = result.ErrorMessage
                }),
                _ => BadRequest(new
                {
                    code = result.ErrorCode,
                    message = result.ErrorMessage
                })
            };
        }

        return Created(
            $"/api/v1/appointments/{result.AppointmentId}",
            new
            {
                appointmentId = result.AppointmentId
            });
    }

    [HttpPut("{appointmentId:guid}/attendance")]
    public async Task<IActionResult> SetAttendance(
        Guid appointmentId,
        SetAppointmentAttendanceRequest request,
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(cancellationToken);

        var result = await _appointments.SetAttendanceAsync(
            appointmentId,
            request.AttendanceStatus,
            scope,
            User.GetUserIdOrThrow(),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);

        return result.Succeeded
            ? NoContent()
            : NotFound(new
            {
                code = result.ErrorCode,
                message = result.ErrorMessage
            });
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
