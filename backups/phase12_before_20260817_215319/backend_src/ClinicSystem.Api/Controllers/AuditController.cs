using ClinicSystem.Infrastructure.Audit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/audit")]
[Authorize(Roles = "Owner")]
[EnableRateLimiting("api")]
public sealed class AuditController : ControllerBase
{
    private readonly AuditLogQueryService _service;

    public AuditController(
        AuditLogQueryService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] string? search,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        return Ok(
            await _service.SearchAsync(
                search,
                fromUtc,
                toUtc,
                page,
                pageSize,
                cancellationToken));
    }
}
