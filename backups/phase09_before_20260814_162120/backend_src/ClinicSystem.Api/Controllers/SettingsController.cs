using ClinicSystem.Api.Common;
using ClinicSystem.Api.Contracts.Settings;
using ClinicSystem.Infrastructure.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/settings")]
[Authorize]
[EnableRateLimiting("api")]
public sealed class SettingsController : ControllerBase
{
    private readonly ClinicSettingsService _service;

    public SettingsController(
        ClinicSettingsService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> Get(
        CancellationToken cancellationToken)
    {
        return Ok(
            await _service.GetAsync(
                cancellationToken));
    }

    [HttpPut]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Update(
        UpdateClinicSettingRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(
            await _service.UpdateAsync(
                new UpdateClinicSettingCommand(
                    request.ClinicName,
                    request.HeaderInvocationAr,
                    request.CurrencyCode,
                    request.AppointmentReminderTemplateAr,
                    request.AppointmentReminderTemplateEn),
                User.GetUserIdOrThrow(),
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                cancellationToken));
    }
}
