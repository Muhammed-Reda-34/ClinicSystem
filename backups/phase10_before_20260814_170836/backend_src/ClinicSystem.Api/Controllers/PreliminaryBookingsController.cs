using ClinicSystem.Api.Common;
using ClinicSystem.Api.Contracts.PreliminaryBookings;
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

    public PreliminaryBookingsController(
        PreliminaryBookingService bookings)
    {
        _bookings = bookings;
    }

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] DateOnly date,
        CancellationToken cancellationToken)
    {
        return Ok(
            await _bookings.GetAsync(
                date,
                cancellationToken));
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        CreatePreliminaryBookingRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _bookings.CreateAsync(
            new CreatePreliminaryBookingCommand(
                request.PatientName,
                request.PhoneNumber,
                request.VisitDate,
                request.VisitTime),
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
                bookingId = result.BookingId
            });
    }

    [HttpPut("{bookingId:guid}/attendance")]
    public async Task<IActionResult> SetAttendance(
        Guid bookingId,
        SetPreliminaryBookingStatusRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _bookings.SetStatusAsync(
            bookingId,
            request.AttendanceStatus,
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

        return NoContent();
    }
}
