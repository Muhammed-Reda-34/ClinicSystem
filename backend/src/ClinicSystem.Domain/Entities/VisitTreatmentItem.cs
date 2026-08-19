namespace ClinicSystem.Domain.Entities;

public sealed class VisitTreatmentItem
{
    public Guid Id { get; set; }
    public Guid VisitId { get; set; }

    public Guid? DentalServiceId { get; set; }

    public string ServiceNameArSnapshot { get; set; } = string.Empty;
    public string? ServiceNameEnSnapshot { get; set; }

    public decimal UnitPriceSnapshot { get; set; }
    public int Quantity { get; set; } = 1;

    public string? Notes { get; set; }

    // A treatment case groups multiple clinical sessions of the same
    // treatment (for example root-canal sessions) across separate visits.
    public Guid TreatmentCaseId { get; set; }
    public int SessionNumber { get; set; } = 1;
    public bool CompletesTreatmentCase { get; set; } = true;

    public PatientVisit Visit { get; set; } = null!;
    public DentalService? DentalService { get; set; }

    public ICollection<VisitTreatmentTooth> Teeth { get; set; }
        = new List<VisitTreatmentTooth>();
}
