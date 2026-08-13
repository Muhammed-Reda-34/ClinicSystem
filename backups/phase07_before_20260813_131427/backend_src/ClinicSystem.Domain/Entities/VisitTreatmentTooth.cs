namespace ClinicSystem.Domain.Entities;

public sealed class VisitTreatmentTooth
{
    public Guid VisitTreatmentItemId { get; set; }
    public int ToothFdiNumber { get; set; }

    public VisitTreatmentItem VisitTreatmentItem { get; set; } = null!;
}
