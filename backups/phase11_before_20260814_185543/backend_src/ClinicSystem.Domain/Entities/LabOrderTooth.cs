namespace ClinicSystem.Domain.Entities;

public sealed class LabOrderTooth
{
    public Guid LabOrderId { get; set; }
    public int ToothFdiNumber { get; set; }

    public LabOrder LabOrder { get; set; } = null!;
}
