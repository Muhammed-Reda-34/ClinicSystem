using ClinicSystem.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/system")]
public sealed class DatabaseHealthController : ControllerBase
{
    [HttpGet("database")]
    public async Task<IActionResult> Database(
        [FromServices] ClinicDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var canConnect =
            await dbContext.Database.CanConnectAsync(
                cancellationToken);

        if (!canConnect)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new
                {
                    status = "error",
                    database = "unavailable"
                });
        }

        return Ok(new
        {
            status = "ok",
            database = "connected"
        });
    }
}
