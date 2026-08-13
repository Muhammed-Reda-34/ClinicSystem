using ClinicSystem.Api.Common;
using ClinicSystem.Api.Contracts.Services;
using ClinicSystem.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/dental-services")]
[Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
[EnableRateLimiting("api")]
public sealed class DentalServicesController : ControllerBase
{
    private readonly DentalServiceService _services;

    public DentalServicesController(DentalServiceService services)
    {
        _services = services;
    }

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        if (
            includeInactive
            && !User.IsInRole("Owner")
            && !User.IsInRole("Doctor")
        )
        {
            includeInactive = false;
        }

        return Ok(
            await _services.GetAsync(
                includeInactive,
                cancellationToken));
    }

    [HttpGet("{serviceId:guid}/price-history")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> PriceHistory(
        Guid serviceId,
        CancellationToken cancellationToken)
    {
        return Ok(
            await _services.GetPriceHistoryAsync(
                serviceId,
                cancellationToken));
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> Create(
        CreateDentalServiceRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var id = await _services.CreateAsync(
                new CreateDentalServiceCommand(
                    request.Category,
                    request.NameAr,
                    request.NameEn,
                    request.CurrentPrice,
                    request.PricingNoteAr),
                User.GetUserIdOrThrow(),
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                cancellationToken);

            return Created(
                $"/api/v1/dental-services/{id}",
                new { serviceId = id });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new
            {
                message = exception.Message
            });
        }
    }

    [HttpPut("{serviceId:guid}")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> Update(
        Guid serviceId,
        UpdateDentalServiceRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _services.UpdateAsync(
                serviceId,
                new UpdateDentalServiceCommand(
                    request.Category,
                    request.NameAr,
                    request.NameEn,
                    request.CurrentPrice,
                    request.PricingNoteAr,
                    request.IsActive),
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
}
