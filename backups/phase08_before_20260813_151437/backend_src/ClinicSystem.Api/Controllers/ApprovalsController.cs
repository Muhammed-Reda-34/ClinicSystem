using ClinicSystem.Api.Common;
using ClinicSystem.Api.Contracts.Approvals;
using ClinicSystem.Infrastructure.Approvals;
using ClinicSystem.Infrastructure.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/approvals")]
[Authorize]
[EnableRateLimiting("api")]
public sealed class ApprovalsController : ControllerBase
{
    private readonly ApprovalService _approvals;
    private readonly DoctorScopeService _doctorScope;

    public ApprovalsController(
        ApprovalService approvals,
        DoctorScopeService doctorScope)
    {
        _approvals = approvals;
        _doctorScope = doctorScope;
    }

    [HttpGet("pending")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> Pending(
        CancellationToken cancellationToken)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        return Ok(
            await _approvals.GetPendingAsync(
                scope,
                User.IsInRole("Owner"),
                cancellationToken));
    }

    [HttpGet("pending/count")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> PendingCount(
        CancellationToken cancellationToken)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        var count =
            await _approvals.GetPendingCountAsync(
                scope,
                User.IsInRole("Owner"),
                cancellationToken);

        return Ok(
            new { count });
    }

    [HttpPost("patient/{patientId:guid}/delete")]
    [Authorize(Roles = "Secretary,Nurse")]
    public async Task<IActionResult> RequestPatientDeletion(
        Guid patientId,
        CreatePatientDeletionApprovalRequest request,
        CancellationToken cancellationToken)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        var result =
            await _approvals.RequestPatientArchiveAsync(
                patientId,
                request.DoctorId,
                scope,
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        return result.Succeeded
            ? Accepted(
                new
                {
                    approvalRequestId =
                        result.RequestId,
                    expiresInHours =
                        ApprovalService.ExpirationHours
                })
            : BadRequest(
                new
                {
                    code =
                        result.ErrorCode,
                    message =
                        result.ErrorMessage
                });
    }

    [HttpPost("attachment/delete")]
    [Authorize(Roles = "Secretary,Nurse")]
    public async Task<IActionResult> RequestAttachmentDeletion(
        CreateAttachmentDeletionApprovalRequest request,
        CancellationToken cancellationToken)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        var result =
            await _approvals.RequestAttachmentDeleteAsync(
                request.AttachmentId,
                request.DoctorId,
                scope,
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        return result.Succeeded
            ? Accepted(
                new
                {
                    approvalRequestId =
                        result.RequestId,
                    expiresInHours =
                        ApprovalService.ExpirationHours
                })
            : BadRequest(
                new
                {
                    code =
                        result.ErrorCode,
                    message =
                        result.ErrorMessage
                });
    }

    [HttpPost("{requestId:guid}/approve")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> Approve(
        Guid requestId,
        ReviewApprovalRequest request,
        CancellationToken cancellationToken)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        var result =
            await _approvals.ApproveAsync(
                requestId,
                scope,
                User.IsInRole("Owner"),
                User.GetUserIdOrThrow(),
                request.Note,
                GetClientIp(),
                cancellationToken);

        return result.Succeeded
            ? NoContent()
            : BadRequest(
                new
                {
                    code =
                        result.ErrorCode,
                    message =
                        result.ErrorMessage
                });
    }

    [HttpPost("{requestId:guid}/reject")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> Reject(
        Guid requestId,
        ReviewApprovalRequest request,
        CancellationToken cancellationToken)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        var result =
            await _approvals.RejectAsync(
                requestId,
                scope,
                User.IsInRole("Owner"),
                User.GetUserIdOrThrow(),
                request.Note,
                GetClientIp(),
                cancellationToken);

        return result.Succeeded
            ? NoContent()
            : BadRequest(
                new
                {
                    code =
                        result.ErrorCode,
                    message =
                        result.ErrorMessage
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
                out var value)
            && Guid.TryParse(
                value.FirstOrDefault(),
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
        HttpContext.Connection
        .RemoteIpAddress
        ?.ToString();
}
