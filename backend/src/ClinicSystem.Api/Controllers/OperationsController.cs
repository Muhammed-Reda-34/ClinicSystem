using ClinicSystem.Api.Common;
using ClinicSystem.Api.Contracts.Appointments;
using ClinicSystem.Infrastructure.Context;
using ClinicSystem.Infrastructure.Operations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/operations")]
[Authorize]
[EnableRateLimiting("api")]
public sealed class OperationsController : ControllerBase
{
    private readonly OperationsService _service;
    private readonly DoctorScopeService _doctorScope;

    public OperationsController(
        OperationsService service,
        DoctorScopeService doctorScope)
    {
        _service = service;
        _doctorScope = doctorScope;
    }

    [HttpGet("visits")]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> Visits(
        [FromQuery] string? search,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] int take = 100,
        CancellationToken cancellationToken = default)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        return Ok(
            await _service.GetRecentVisitsAsync(
                scope,
                search,
                fromUtc,
                toUtc,
                take,
                cancellationToken));
    }

    [HttpPost("patients/{patientId:guid}/remove-blacklist")]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> RemoveBlacklist(
        Guid patientId,
        CancellationToken cancellationToken)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        var result =
            await _service.RemovePatientFromBlacklistAsync(
                patientId,
                scope,
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        return result.Succeeded
            ? NoContent()
            : NotFound(
                new
                {
                    code = result.ErrorCode,
                    message = result.ErrorMessage
                });
    }

    [HttpPost("patients/{patientId:guid}/archive")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> ArchivePatient(
        Guid patientId,
        CancellationToken cancellationToken)
    {
        var result =
            await _service.ArchivePatientAsync(
                patientId,
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        return result.Succeeded
            ? NoContent()
            : NotFound(
                new
                {
                    code = result.ErrorCode,
                    message = result.ErrorMessage
                });
    }

    [HttpPut("appointments/{appointmentId:guid}/reschedule")]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> RescheduleAppointment(
        Guid appointmentId,
        RescheduleAppointmentRequest request,
        CancellationToken cancellationToken)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        var result =
            await _service.RescheduleAppointmentAsync(
                appointmentId,
                new RescheduleAppointmentCommand(
                    request.ScheduledAtUtc,
                    request.DurationMinutes,
                    request.Notes),
                scope,
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        return result.Succeeded
            ? NoContent()
            : BadRequest(
                new
                {
                    code = result.ErrorCode,
                    message = result.ErrorMessage
                });
    }

    [HttpDelete("visits/{visitId:guid}/payments/{paymentId:guid}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> DeletePayment(
        Guid visitId,
        Guid paymentId,
        CancellationToken cancellationToken)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        var result =
            await _service.DeletePaymentAsync(
                visitId,
                paymentId,
                scope,
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        return result.Succeeded
            ? NoContent()
            : NotFound(
                new
                {
                    code = result.ErrorCode,
                    message = result.ErrorMessage
                });
    }

    private async Task<IReadOnlyCollection<Guid>>
        ResolveScopeAsync(
            CancellationToken cancellationToken)
    {
        Guid? requestedDoctorId = null;

        if (
            Request.Headers.TryGetValue(
                "X-Doctor-Id",
                out var raw)
            && Guid.TryParse(
                raw.FirstOrDefault(),
                out var parsed)
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

    private string? GetClientIp() =>
        HttpContext.Connection.RemoteIpAddress?.ToString();
}
