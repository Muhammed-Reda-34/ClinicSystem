using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Lab;

public sealed class CreateLabExpenseRequest
{
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public Guid? VisitId { get; set; }
    public Guid? LabOrderId { get; set; }

    [Required, MaxLength(300)]
    public string ServiceOrItemName { get; set; } = string.Empty;

    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    public DateTime ExpenseDateUtc { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }
}
