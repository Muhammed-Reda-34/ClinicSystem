using ClinicSystem.Api.Common;
using ClinicSystem.Api.Contracts.Visits;
using ClinicSystem.Infrastructure.Context;
using ClinicSystem.Infrastructure.Visits;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/visits")]
[Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
[EnableRateLimiting("api")]
public sealed class VisitsController : ControllerBase
{
    private readonly VisitService _visits;
    private readonly DoctorScopeService _doctorScope;

    public VisitsController(
        VisitService visits,
        DoctorScopeService doctorScope)
    {
        _visits = visits;
        _doctorScope = doctorScope;
    }

    [HttpGet("patient/{patientId:guid}")]
    public async Task<IActionResult> PatientVisits(
        Guid patientId,
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(cancellationToken);

        return Ok(
            await _visits.GetPatientVisitsAsync(
                patientId,
                scope,
                cancellationToken));
    }


    [HttpGet("follow-ups")]
    public async Task<IActionResult> FollowUps(
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
            await _visits.GetFollowUpsAsync(
                scope,
                fromUtc,
                toUtc,
                cancellationToken));
    }

    [HttpPut("{visitId:guid}/follow-up/completed")]
    public async Task<IActionResult> MarkFollowUpCompleted(
        Guid visitId,
        CancellationToken cancellationToken)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        var result =
            await _visits.MarkFollowUpCompletedAsync(
                visitId,
                scope,
                User.GetUserIdOrThrow(),
                HttpContext.Connection
                    .RemoteIpAddress
                    ?.ToString(),
                cancellationToken);

        return result.Succeeded
            ? NoContent()
            : NotFound(
                new
                {
                    code =
                        result.ErrorCode,
                    message =
                        result.ErrorMessage
                });
    }

    [HttpPut("{visitId:guid}/follow-up/reschedule")]
    public async Task<IActionResult> RescheduleFollowUp(
        Guid visitId,
        RescheduleFollowUpRequest request,
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(cancellationToken);

        var result = await _visits.RescheduleFollowUpAsync(
            visitId,
            new RescheduleFollowUpCommand(
                request.FollowUpAtUtc,
                request.Reason),
            scope,
            User.GetUserIdOrThrow(),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);

        return result.Succeeded
            ? NoContent()
            : NotFound(new { code = result.ErrorCode, message = result.ErrorMessage });
    }

    [HttpGet("debts")]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> Debts(
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(cancellationToken);

        return Ok(
            await _visits.GetDebtsAsync(
                scope,
                cancellationToken));
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> Create(
        CreatePatientVisitRequest request,
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(cancellationToken);

        var result = await _visits.CreateAsync(
            new CreateVisitCommand(
                request.PatientId,
                request.DoctorId,
                request.AppointmentId,
                request.VisitDateUtc,
                request.ClinicalNotes,
                request.DiscountAmount,
                request.ExtraAmount,
                request.ExtraReason,
                request.FollowUpAtUtc,
                request.Treatments.Select(
                    x => new CreateVisitTreatmentCommand(
                        x.DentalServiceId,
                        x.Quantity,
                        x.ToothNumbers,
                        x.Notes,
                        x.CompletesTreatmentCase))
                    .ToArray(),
                request.InitialPayment,
                request.PaymentMethod,
                request.InitialPaymentNotes,
                request.IsHistoricalEntry),
            scope,
            User.GetUserIdOrThrow(),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);

        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                code = result.ErrorCode,
                message = result.ErrorMessage
            });
        }

        return Created(
            $"/api/v1/visits/{result.VisitId}",
            new
            {
                visitId = result.VisitId
            });
    }

    [HttpPut("{visitId:guid}")]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> Update(
        Guid visitId,
        UpdatePatientVisitRequest request,
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(cancellationToken);

        var result = await _visits.UpdateAsync(
            visitId,
            new UpdateVisitCommand(
                request.VisitDateUtc,
                request.ClinicalNotes,
                request.DiscountAmount,
                request.ExtraAmount,
                request.ExtraReason,
                request.FollowUpAtUtc,
                request.Treatments.Select(x =>
                    new UpdateVisitTreatmentCommand(
                        x.TreatmentItemId,
                        x.DentalServiceId,
                        x.Quantity,
                        x.ToothNumbers,
                        x.Notes,
                        x.CompletesTreatmentCase))
                    .ToArray(),
                request.IsHistoricalEntry),
            scope,
            User.GetUserIdOrThrow(),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);

        return result.Succeeded
            ? NoContent()
            : BadRequest(new { code = result.ErrorCode, message = result.ErrorMessage });
    }

    [HttpDelete("{visitId:guid}")]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> DeleteVisit(
        Guid visitId,
        [FromBody] VoidPatientVisitRequest request,
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(cancellationToken);

        var result = await _visits.VoidAsync(
            visitId,
            request.Reason,
            scope,
            User.GetUserIdOrThrow(),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);

        return result.Succeeded
            ? NoContent()
            : BadRequest(new { code = result.ErrorCode, message = result.ErrorMessage });
    }

    [HttpPost("treatments/{treatmentItemId:guid}/sessions")]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> CreateTreatmentSession(
        Guid treatmentItemId,
        CreateTreatmentSessionRequest request,
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(cancellationToken);

        var result = await _visits.CreateTreatmentSessionAsync(
            treatmentItemId,
            new CreateTreatmentSessionCommand(
                request.VisitDateUtc,
                request.SessionNotes,
                request.ClinicalNotes,
                request.FollowUpAtUtc,
                request.CompletesTreatmentCase,
                request.IsHistoricalEntry),
            scope,
            User.GetUserIdOrThrow(),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);

        if (!result.Succeeded)
        {
            return BadRequest(new { code = result.ErrorCode, message = result.ErrorMessage });
        }

        return Created(
            $"/api/v1/visits/{result.VisitId}",
            new { visitId = result.VisitId });
    }

    [HttpPost("{visitId:guid}/payments")]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> AddPayment(
        Guid visitId,
        AddPaymentRequest request,
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(cancellationToken);

        var result = await _visits.AddPaymentAsync(
            visitId,
            request.Amount,
            request.Method,
            request.Notes,
            scope,
            User.GetUserIdOrThrow(),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);

        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                code = result.ErrorCode,
                message = result.ErrorMessage
            });
        }

        return NoContent();
    }

    private async Task<IReadOnlyCollection<Guid>> ResolveScopeAsync(
        CancellationToken cancellationToken)
    {
        Guid? requestedDoctorId = null;
        var roles = User.GetRoles();

        if (
            Request.Headers.TryGetValue("X-Doctor-Id", out var value)
            && Guid.TryParse(value.FirstOrDefault(), out var parsed)
        )
        {
            requestedDoctorId = parsed;
        }

        // Owner account always resolves the full clinic doctor scope for patient history.
        // Doctors and staff remain isolated to their allowed scope.
        if (roles.Contains("Owner"))
        {
            requestedDoctorId = null;
        }

        return await _doctorScope.ResolveDoctorIdsAsync(
            User.GetUserIdOrThrow(),
            roles,
            requestedDoctorId,
            cancellationToken);
    }
}
