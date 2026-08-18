namespace ClinicSystem.Api.Contracts.Approvals;

public sealed class CreatePatientDeletionApprovalRequest
{
    public Guid DoctorId { get; set; }
}

public sealed class CreateAttachmentDeletionApprovalRequest
{
    public Guid AttachmentId { get; set; }
    public Guid DoctorId { get; set; }
}

public sealed class ReviewApprovalRequest
{
    public string? Note { get; set; }
}
