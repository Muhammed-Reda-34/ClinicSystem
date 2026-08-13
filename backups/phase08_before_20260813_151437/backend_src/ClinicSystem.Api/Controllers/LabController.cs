using ClinicSystem.Api.Common;
using ClinicSystem.Api.Contracts.Lab;
using ClinicSystem.Infrastructure.Context;
using ClinicSystem.Infrastructure.Lab;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/lab")]
[Authorize]
[EnableRateLimiting("api")]
public sealed class LabController : ControllerBase
{
    private readonly LabService _service;
    private readonly DoctorScopeService _doctorScope;

    public LabController(
        LabService service,
        DoctorScopeService doctorScope)
    {
        _service = service;
        _doctorScope = doctorScope;
    }

    [HttpGet("patient-lookup")]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> LookupPatient(
        [FromQuery] string search,
        CancellationToken cancellationToken)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        return Ok(
            await _service.LookupPatientsAsync(
                search,
                scope,
                cancellationToken));
    }

    [HttpGet("orders")]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> GetOrders(
        [FromQuery] int take = 100,
        CancellationToken cancellationToken = default)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        return Ok(
            await _service.GetOrdersAsync(
                scope,
                take,
                cancellationToken));
    }

    [HttpPost("orders")]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> CreateOrder(
        CreateLabOrderRequest request,
        CancellationToken cancellationToken)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        var result =
            await _service.CreateOrderAsync(
                new CreateLabOrderCommand(
                    request.PatientId,
                    request.DoctorId,
                    request.VisitId,
                    request.CaseDescription,
                    request.WorkTypes,
                    request.ToothNumbers,
                    request.MaterialOptions,
                    request.Shade,
                    request.DigitalPhotosSent,
                    request.ValueLevel,
                    request.OcclusalStaining,
                    request.Instructions),
                scope,
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        return result.Succeeded
            ? Created(
                $"/api/v1/lab/orders/{result.Id}",
                new { id = result.Id })
            : BadRequest(
                new
                {
                    code = result.ErrorCode,
                    message = result.ErrorMessage
                });
    }

    [HttpGet("expenses")]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> GetExpenses(
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] int take = 100,
        CancellationToken cancellationToken = default)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        return Ok(
            await _service.GetExpensesAsync(
                scope,
                fromUtc,
                toUtc,
                take,
                cancellationToken));
    }

    [HttpPost("expenses")]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> CreateExpense(
        CreateLabExpenseRequest request,
        CancellationToken cancellationToken)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        var result =
            await _service.CreateExpenseAsync(
                new CreateLabExpenseCommand(
                    request.PatientId,
                    request.DoctorId,
                    request.VisitId,
                    request.LabOrderId,
                    request.ServiceOrItemName,
                    request.Amount,
                    request.ExpenseDateUtc,
                    request.Notes),
                scope,
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        return result.Succeeded
            ? Created(
                $"/api/v1/lab/expenses/{result.Id}",
                new { id = result.Id })
            : BadRequest(
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

        return await _doctorScope
            .ResolveDoctorIdsAsync(
                User.GetUserIdOrThrow(),
                User.GetRoles(),
                requestedDoctorId,
                cancellationToken);
    }

    private string? GetClientIp() =>
        HttpContext.Connection.RemoteIpAddress?.ToString();
}
