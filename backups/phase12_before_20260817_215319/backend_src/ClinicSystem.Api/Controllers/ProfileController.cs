using ClinicSystem.Api.Common;
using ClinicSystem.Infrastructure.Profile;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/profile")]
[Authorize(Roles = "Owner,Doctor")]
[EnableRateLimiting("api")]
public sealed class ProfileController : ControllerBase
{
    private readonly DoctorProfilePhotoService _photos;

    public ProfileController(
        DoctorProfilePhotoService photos)
    {
        _photos = photos;
    }

    [HttpGet("doctor-photo")]
    public async Task<IActionResult> GetDoctorPhoto(
        CancellationToken cancellationToken)
    {
        return Ok(
            await _photos.GetAsync(
                User.GetUserIdOrThrow(),
                cancellationToken));
    }

    [HttpPut("doctor-photo")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> UpdateDoctorPhoto(
        [FromForm] IFormFile file,
        CancellationToken cancellationToken)
    {
        if (
            file.Length <= 0
            || file.Length
                > DoctorProfilePhotoService.MaxBytes
        )
        {
            return BadRequest(
                new
                {
                    message =
                        "Profile image must be 5 MB or smaller."
                });
        }

        await using var stream =
            new MemoryStream();

        await file.CopyToAsync(
            stream,
            cancellationToken);

        var result =
            await _photos.UpdateAsync(
                User.GetUserIdOrThrow(),
                stream.ToArray(),
                file.ContentType,
                HttpContext.Connection
                    .RemoteIpAddress
                    ?.ToString(),
                cancellationToken);

        return result.Succeeded
            ? NoContent()
            : BadRequest(
                new
                {
                    code = result.ErrorCode,
                    message = result.ErrorMessage
                });
    }

    [HttpDelete("doctor-photo")]
    public async Task<IActionResult> DeleteDoctorPhoto(
        CancellationToken cancellationToken)
    {
        var deleted =
            await _photos.DeleteAsync(
                User.GetUserIdOrThrow(),
                HttpContext.Connection
                    .RemoteIpAddress
                    ?.ToString(),
                cancellationToken);

        return deleted
            ? NoContent()
            : NotFound();
    }
}
