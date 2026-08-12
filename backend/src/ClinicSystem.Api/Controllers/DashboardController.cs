using ClinicSystem.Api.Common;
using ClinicSystem.Application.Common.Security;
using ClinicSystem.Infrastructure.Context;
using ClinicSystem.Infrastructure.Finance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/dashboard")]
[Authorize]
[EnableRateLimiting("api")]
public sealed class DashboardController : ControllerBase
{
    private readonly FinanceService _finance;
    private readonly DoctorScopeService _doctorScope;

    public DashboardController(
        FinanceService finance,
        DoctorScopeService doctorScope)
    {
        _finance = finance;
        _doctorScope = doctorScope;
    }

    [HttpGet]
    public async Task<IActionResult> Get(
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

        var scope =
            await _doctorScope.ResolveDoctorIdsAsync(
                User.GetUserIdOrThrow(),
                User.GetRoles(),
                requestedDoctorId,
                cancellationToken);

        var canViewFinancials =
            User.IsInRole(UserRoles.Owner)
            || User.IsInRole(UserRoles.Doctor);

        var isClinicWide =
            User.IsInRole(UserRoles.Owner)
            && requestedDoctorId is null;

        var localToday =
            DateTime.Today;

        var start =
            DateTime.SpecifyKind(
                localToday,
                DateTimeKind.Local)
            .ToUniversalTime();

        var end =
            DateTime.SpecifyKind(
                localToday.AddDays(1),
                DateTimeKind.Local)
            .ToUniversalTime();

        return Ok(
            await _finance.GetDashboardAsync(
                scope,
                canViewFinancials,
                isClinicWide,
                start,
                end,
                cancellationToken));
    }
}
