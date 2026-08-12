using ClinicSystem.Api.Common;
using ClinicSystem.Infrastructure.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/context")]
[Authorize]
[EnableRateLimiting("api")]
public sealed class ContextController
    : ControllerBase
{
    private readonly DoctorScopeService
        _doctorScope;

    public ContextController(
        DoctorScopeService doctorScope)
    {
        _doctorScope = doctorScope;
    }

    [HttpGet("doctors")]
    public async Task<IActionResult> Doctors(
        CancellationToken cancellationToken)
    {
        var doctors =
            await _doctorScope
            .GetAccessibleDoctorsAsync(
                User.GetUserIdOrThrow(),
                User.GetRoles(),
                cancellationToken);

        return Ok(doctors);
    }
}
