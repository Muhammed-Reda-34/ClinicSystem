using ClinicSystem.Api.Contracts.Users;
using ClinicSystem.Infrastructure.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/admin/users")]
[Authorize(Roles = "Owner,Doctor")]
[EnableRateLimiting("api")]
public sealed class AdminUsersController : ControllerBase
{
    private readonly UserManagementService _service;

    public AdminUsersController(UserManagementService service)
    {
        _service = service;
    }

    [HttpGet("doctors")]
    public async Task<IActionResult> GetDoctors(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetDoctorsAsync(cancellationToken));
    }

    [HttpGet("staff")]
    public async Task<IActionResult> GetStaff(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetStaffAsync(cancellationToken));
    }

    // Intentionally no POST /doctors endpoint here.
    // Doctors can create Secretary/Nurse accounts from the normal application,
    // but creating another Doctor is restricted to the external provisioning portal.

    [HttpPost("staff")]
    public async Task<IActionResult> CreateStaff(
        CreateStaffRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateStaffAsync(
            new CreateStaffCommand(
                request.FullName,
                request.Email,
                request.Password,
                request.Role,
                request.DoctorIds),
            cancellationToken);

        if (!result.Ok)
        {
            return BadRequest(new { message = result.Error });
        }

        return Created(
            $"/api/v1/admin/users/staff/{result.Id}",
            new { userId = result.Id });
    }

    [HttpPut("staff/{staffUserId:guid}/doctors")]
    public async Task<IActionResult> ReplaceStaffDoctors(
        Guid staffUserId,
        UpdateStaffDoctorsRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.ReplaceStaffDoctorsAsync(
            staffUserId,
            request.DoctorIds,
            cancellationToken);

        return result.Ok
            ? NoContent()
            : BadRequest(new { message = result.Error });
    }
}
