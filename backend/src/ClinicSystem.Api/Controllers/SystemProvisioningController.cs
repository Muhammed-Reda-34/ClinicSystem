using System.Security.Cryptography;
using System.Text;
using ClinicSystem.Api.Contracts.Provisioning;
using ClinicSystem.Infrastructure.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/system-provisioning")]
[AllowAnonymous]
[EnableRateLimiting("api")]
public sealed class SystemProvisioningController : ControllerBase
{
    private readonly UserManagementService _service;
    private readonly IConfiguration _configuration;

    public SystemProvisioningController(
        UserManagementService service,
        IConfiguration configuration)
    {
        _service = service;
        _configuration = configuration;
    }

    [HttpPost("doctors/list")]
    public async Task<IActionResult> GetDoctors(
        ProvisioningAccessRequest request,
        CancellationToken cancellationToken)
    {
        var accessResult = ValidateAccess(request.AccessKey);
        if (accessResult is not null)
        {
            return accessResult;
        }

        var doctors = await _service.GetDoctorsAsync(cancellationToken);
        return Ok(doctors);
    }

    [HttpPost("doctors")]
    public async Task<IActionResult> CreateDoctor(
        ProvisionDoctorRequest request,
        CancellationToken cancellationToken)
    {
        var accessResult = ValidateAccess(request.AccessKey);
        if (accessResult is not null)
        {
            return accessResult;
        }

        var result = await _service.CreateDoctorAsync(
            new CreateDoctorCommand(
                request.FullName,
                request.Email,
                request.Password,
                request.Specialization),
            cancellationToken);

        if (!result.Ok)
        {
            return BadRequest(new { message = result.Error });
        }

        return Created(
            $"/api/v1/system-provisioning/doctors/{result.Id}",
            new { doctorId = result.Id });
    }

    [HttpPost("staff")]
    public async Task<IActionResult> CreateStaff(
        ProvisionStaffRequest request,
        CancellationToken cancellationToken)
    {
        var accessResult = ValidateAccess(request.AccessKey);
        if (accessResult is not null)
        {
            return accessResult;
        }

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
            $"/api/v1/system-provisioning/staff/{result.Id}",
            new { userId = result.Id });
    }

    private IActionResult? ValidateAccess(string suppliedKey)
    {
        if (!_configuration.GetValue<bool>("Provisioning:Enabled"))
        {
            return NotFound(new { message = "Provisioning portal is disabled." });
        }

        var configuredKey = _configuration["Provisioning:Key"];
        if (string.IsNullOrWhiteSpace(configuredKey) ||
            string.IsNullOrWhiteSpace(suppliedKey))
        {
            return Unauthorized(new { message = "Invalid provisioning access key." });
        }

        var configuredBytes = Encoding.UTF8.GetBytes(configuredKey);
        var suppliedBytes = Encoding.UTF8.GetBytes(suppliedKey);

        var valid = configuredBytes.Length == suppliedBytes.Length &&
                    CryptographicOperations.FixedTimeEquals(
                        configuredBytes,
                        suppliedBytes);

        return valid
            ? null
            : Unauthorized(new { message = "Invalid provisioning access key." });
    }
}
