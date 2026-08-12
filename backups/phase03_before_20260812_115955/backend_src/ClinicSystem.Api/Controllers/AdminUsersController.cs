using ClinicSystem.Api.Contracts.Users;
using ClinicSystem.Application.Common.Security;
using ClinicSystem.Infrastructure.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace ClinicSystem.Api.Controllers;
[ApiController]
[Route("api/v1/admin/users")]
[Authorize(Policy=AuthorizationPolicies.OwnerOnly)]
public sealed class AdminUsersController:ControllerBase
{
    private readonly UserManagementService _service;
    public AdminUsersController(UserManagementService service){_service=service;}
    [HttpGet("doctors")] public async Task<IActionResult> Doctors(CancellationToken ct)=>Ok(await _service.GetDoctorsAsync(ct));
    [HttpGet("staff")] public async Task<IActionResult> Staff(CancellationToken ct)=>Ok(await _service.GetStaffAsync(ct));
    [HttpPost("doctors")]
    public async Task<IActionResult> CreateDoctor(CreateDoctorRequest r,CancellationToken ct)
    {
        var x=await _service.CreateDoctorAsync(new(r.FullName,r.Email,r.Password,r.Specialization),ct);
        return x.Ok?Created($"/api/v1/admin/users/doctors/{x.Id}",new{doctorId=x.Id}):BadRequest(new{message=x.Error});
    }
    [HttpPost("staff")]
    public async Task<IActionResult> CreateStaff(CreateStaffRequest r,CancellationToken ct)
    {
        var x=await _service.CreateStaffAsync(new(r.FullName,r.Email,r.Password,r.Role,r.DoctorIds),ct);
        return x.Ok?Created($"/api/v1/admin/users/staff/{x.Id}",new{userId=x.Id}):BadRequest(new{message=x.Error});
    }
}
