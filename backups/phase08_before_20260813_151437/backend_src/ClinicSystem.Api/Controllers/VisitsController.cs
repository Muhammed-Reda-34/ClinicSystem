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

    [HttpGet("debts")]
    [Authorize(Roles = "Owner,Doctor,Secretary")]
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
    [Authorize(Roles = "Owner,Doctor,Secretary")]
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
                        x.Notes))
                    .ToArray(),
                request.InitialPayment,
                request.PaymentMethod),
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

    [HttpPost("{visitId:guid}/payments")]
    [Authorize(Roles = "Owner,Secretary")]
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
