using ClinicSystem.Api.Common;
using ClinicSystem.Api.Contracts.Finance;
using ClinicSystem.Application.Common.Security;
using ClinicSystem.Infrastructure.Context;
using ClinicSystem.Infrastructure.Finance;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/finance")]
[Authorize]
[EnableRateLimiting("api")]
public sealed class FinanceController : ControllerBase
{
    private readonly FinanceService _service;
    private readonly DoctorScopeService _doctorScope;

    public FinanceController(
        FinanceService service,
        DoctorScopeService doctorScope)
    {
        _service = service;
        _doctorScope = doctorScope;
    }

    [HttpGet("monthly-report")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> MonthlyReport(
        [FromQuery] int year,
        [FromQuery] int month,
        CancellationToken cancellationToken)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        var isClinicWide = false;

        if (User.IsInRole(UserRoles.Owner))
        {
            if (!TryGetRequestedDoctorId(out var requestedDoctorId))
            {
                isClinicWide = true;
            }
            else
            {
                var accessibleDoctors =
                    await _doctorScope.GetAccessibleDoctorsAsync(
                        User.GetUserIdOrThrow(),
                        User.GetRoles(),
                        cancellationToken);

                isClinicWide = accessibleDoctors.Any(doctor =>
                    doctor.DoctorId == requestedDoctorId
                    && doctor.IsOwner);
            }
        }

        return Ok(
            await _service.GetMonthlyReportAsync(
                year,
                month,
                scope,
                isClinicWide,
                cancellationToken));
    }

    [HttpGet("expenses")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> Expenses(
        [FromQuery] int year,
        [FromQuery] int month,
        CancellationToken cancellationToken)
    {
        return Ok(
            await _service.GetClinicExpensesAsync(
                year,
                month,
                cancellationToken));
    }

    [HttpPost("expenses")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> AddExpense(
        CreateClinicExpenseRequest request,
        CancellationToken cancellationToken)
    {
        var result =
            await _service.CreateClinicExpenseAsync(
                new CreateClinicExpenseCommand(
                    request.Category,
                    request.Description,
                    request.Amount,
                    request.ExpenseDateUtc,
                    request.Notes),
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        return result.Ok
            ? Created(
                $"/api/v1/finance/expenses/{result.Id}",
                new { id = result.Id })
            : BadRequest(
                new { message = result.Error });
    }

    [HttpGet("salary-profiles")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> SalaryProfiles(
        CancellationToken cancellationToken)
    {
        return Ok(
            await _service.GetSalaryProfilesAsync(
                cancellationToken));
    }

    [HttpPost("salary-profiles/{userId:guid}")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> SetSalaryRate(
        Guid userId,
        SetSalaryRateRequest request,
        CancellationToken cancellationToken)
    {
        var result =
            await _service.SetSalaryRateAsync(
                userId,
                request.BaseSalary,
                request.EffectiveFrom,
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        return result.Ok
            ? Created(
                $"/api/v1/finance/salary-rates/{result.Id}",
                new { id = result.Id })
            : BadRequest(
                new { message = result.Error });
    }

    [HttpGet("salary-adjustments")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> SalaryAdjustments(
        [FromQuery] int year,
        [FromQuery] int month,
        CancellationToken cancellationToken)
    {
        return Ok(
            await _service.GetSalaryAdjustmentsAsync(
                year,
                month,
                cancellationToken));
    }

    [HttpPost("salary-adjustments/{userId:guid}")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> AddSalaryAdjustment(
        Guid userId,
        AddSalaryAdjustmentRequest request,
        CancellationToken cancellationToken)
    {
        var result =
            await _service.AddSalaryAdjustmentAsync(
                userId,
                request.Year,
                request.Month,
                request.Type,
                request.Amount,
                request.Notes,
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        return result.Ok
            ? Created(
                $"/api/v1/finance/salary-adjustments/{result.Id}",
                new { id = result.Id })
            : BadRequest(
                new { message = result.Error });
    }

    [HttpGet("payroll")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> Payroll(
        [FromQuery] int year,
        [FromQuery] int month,
        CancellationToken cancellationToken)
    {
        return Ok(
            await _service.GetPayrollAsync(
                year,
                month,
                cancellationToken));
    }

    [HttpGet("periods")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> Periods(
        CancellationToken cancellationToken)
    {
        return Ok(
            await _service.GetAccountingPeriodsAsync(
                cancellationToken));
    }

    [HttpPost("periods/{year:int}/{month:int}/close")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> ClosePeriod(
        int year,
        int month,
        CancellationToken cancellationToken)
    {
        var result =
            await _service.ClosePeriodAsync(
                year,
                month,
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        return result.Ok
            ? NoContent()
            : BadRequest(
                new { message = result.Error });
    }

    [HttpPost("periods/{year:int}/{month:int}/reopen")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> ReopenPeriod(
        int year,
        int month,
        CancellationToken cancellationToken)
    {
        var result =
            await _service.ReopenPeriodAsync(
                year,
                month,
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        return result.Ok
            ? NoContent()
            : BadRequest(
                new { message = result.Error });
    }

    private bool TryGetRequestedDoctorId(
        out Guid requestedDoctorId)
    {
        requestedDoctorId = Guid.Empty;

        return Request.Headers.TryGetValue(
            "X-Doctor-Id",
            out var raw)
            && Guid.TryParse(
                raw.FirstOrDefault(),
                out requestedDoctorId);
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
