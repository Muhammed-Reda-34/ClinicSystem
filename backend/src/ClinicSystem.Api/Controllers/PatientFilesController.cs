using ClinicSystem.Api.Common;
using ClinicSystem.Api.Contracts.PatientFiles;
using ClinicSystem.Domain.Enums;
using ClinicSystem.Infrastructure.Context;
using ClinicSystem.Infrastructure.PatientFiles;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/patients/{patientId:guid}")]
[Authorize]
[EnableRateLimiting("api")]
public sealed class PatientFilesController : ControllerBase
{
    private readonly PatientFileService _service;
    private readonly DoctorScopeService _doctorScope;

    public PatientFilesController(
        PatientFileService service,
        DoctorScopeService doctorScope)
    {
        _service = service;
        _doctorScope = doctorScope;
    }

    [HttpGet("attachments")]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> Attachments(
        Guid patientId,
        CancellationToken cancellationToken)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        return Ok(
            await _service.GetAttachmentsAsync(
                patientId,
                scope,
                cancellationToken));
    }

    [HttpPost("attachments")]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public async Task<IActionResult> UploadAttachment(
        Guid patientId,
        [FromForm] IFormFile file,
        [FromForm] PatientAttachmentCategory category,
        [FromForm] Guid? doctorId,
        [FromForm] string? notes,
        CancellationToken cancellationToken)
    {
        if (
            file.Length <= 0
            || file.Length
                > PatientFileService.MaxAttachmentBytes
        )
        {
            return BadRequest(
                new
                {
                    message =
                        "Attachment must be between 1 byte and 10 MB."
                });
        }

        await using var stream =
            new MemoryStream();

        await file.CopyToAsync(
            stream,
            cancellationToken);

        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        var result =
            await _service.AddAttachmentAsync(
                patientId,
                doctorId,
                category,
                file.FileName,
                file.ContentType,
                stream.ToArray(),
                notes,
                scope,
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        return result.Ok
            ? Created(
                $"/api/v1/patients/{patientId}/attachments/{result.Id}",
                new { id = result.Id })
            : BadRequest(
                new
                {
                    message = result.Error
                });
    }

    [HttpGet("attachments/{attachmentId:guid}/download")]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> DownloadAttachment(
        Guid patientId,
        Guid attachmentId,
        CancellationToken cancellationToken)
    {
        _ = patientId;

        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        var attachment =
            await _service.DownloadAsync(
                attachmentId,
                scope,
                cancellationToken);

        if (attachment is null)
        {
            return NotFound();
        }

        Response.Headers["Content-Disposition"] =
            $"attachment; filename*=UTF-8''{Uri.EscapeDataString(attachment.OriginalFileName)}";

        return File(
            attachment.Data,
            attachment.ContentType);
    }

    [HttpDelete("attachments/{attachmentId:guid}")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> DeleteAttachment(
        Guid patientId,
        Guid attachmentId,
        CancellationToken cancellationToken)
    {
        _ = patientId;

        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        var deleted =
            await _service.DeleteAttachmentAsync(
                attachmentId,
                scope,
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        return deleted
            ? NoContent()
            : NotFound();
    }

    [HttpGet("clinical-notes")]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> ClinicalNotes(
        Guid patientId,
        CancellationToken cancellationToken)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        return Ok(
            await _service.GetClinicalNotesAsync(
                patientId,
                scope,
                cancellationToken));
    }

    [HttpPost("clinical-notes")]
    [Authorize(Roles = "Owner,Doctor")]
    public async Task<IActionResult> AddClinicalNote(
        Guid patientId,
        AddClinicalNoteRequest request,
        CancellationToken cancellationToken)
    {
        var scope =
            await ResolveScopeAsync(
                cancellationToken);

        var result =
            await _service.AddClinicalNoteAsync(
                patientId,
                request.DoctorId,
                request.NoteText,
                scope,
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        return result.Ok
            ? Created(
                $"/api/v1/patients/{patientId}/clinical-notes/{result.Id}",
                new { id = result.Id })
            : BadRequest(
                new { message = result.Error });
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
