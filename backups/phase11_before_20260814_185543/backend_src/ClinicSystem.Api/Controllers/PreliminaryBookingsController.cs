using ClinicSystem.Api.Common;
using ClinicSystem.Api.Contracts.PreliminaryBookings;
using ClinicSystem.Infrastructure.Context;
using ClinicSystem.Infrastructure.PreliminaryBookings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/preliminary-bookings")]
[Authorize(Roles = "Secretary,Nurse")]
[EnableRateLimiting("api")]
public sealed class PreliminaryBookingsController : ControllerBase
{
    private readonly PreliminaryBookingService _bookings;
    private readonly DoctorScopeService _doctorScope;

    public PreliminaryBookingsController(
        PreliminaryBookingService bookings,
        DoctorScopeService doctorScope)
    {
        _bookings = bookings;
        _doctorScope = doctorScope;
    }

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] DateOnly date,
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(cancellationToken);
        var actorUserId = User.GetUserIdOrThrow();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

        // One-time repair for Phase 09 test rows that were created before
        // preliminary bookings were linked to Patient records.
        await _bookings.ReconcileUnlinkedBookingsAsync(
            scope,
            actorUserId,
            ipAddress,
            cancellationToken);

        return Ok(
            await _bookings.GetAsync(
                date,
                scope,
                cancellationToken));
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        CreatePreliminaryBookingRequest request,
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(cancellationToken);

        var result = await _bookings.CreateAsync(
            new CreatePreliminaryBookingCommand(
                request.PatientName,
                request.PhoneNumber,
                request.VisitDate,
                request.VisitTime),
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
            $"/api/v1/preliminary-bookings/{result.BookingId}",
            new
            {
                bookingId = result.BookingId,
                patientId = result.PatientId,
                wasExistingPatient = result.WasExistingPatient,
                isBlacklisted = result.IsBlacklisted,
                noShowCount = result.NoShowCount
            });
    }

    [HttpPut("{bookingId:guid}/attendance")]
    public async Task<IActionResult> SetAttendance(
        Guid bookingId,
        SetPreliminaryBookingStatusRequest request,
        CancellationToken cancellationToken)
    {
        var scope = await ResolveScopeAsync(cancellationToken);

        var result = await _bookings.SetStatusAsync(
            bookingId,
            request.AttendanceStatus,
            scope,
            User.GetUserIdOrThrow(),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);

        if (!result.Succeeded)
        {
            return result.ErrorCode == "NOT_FOUND"
                ? NotFound(new
                {
                    code = result.ErrorCode,
                    message = result.ErrorMessage
                })
                : BadRequest(new
                {
                    code = result.ErrorCode,
                    message = result.ErrorMessage
                });
        }

        return Ok(new
        {
            bookingId = result.BookingId,
            patientId = result.PatientId,
            isBlacklisted = result.IsBlacklisted,
            noShowCount = result.NoShowCount
        });
    }

    private async Task<IReadOnlyCollection<Guid>> ResolveScopeAsync(
        CancellationToken cancellationToken)
    {
        Guid? requestedDoctorId = null;

        if (
            Request.Headers.TryGetValue("X-Doctor-Id", out var raw)
            && Guid.TryParse(raw.FirstOrDefault(), out var parsed)
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
