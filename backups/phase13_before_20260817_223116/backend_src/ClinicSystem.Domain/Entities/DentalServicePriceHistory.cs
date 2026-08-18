namespace ClinicSystem.Domain.Entities;

public sealed class DentalServicePriceHistory
{
    public Guid Id { get; set; }
    public Guid DentalServiceId { get; set; }

    public decimal OldPrice { get; set; }
    public decimal NewPrice { get; set; }

    public Guid ChangedByUserId { get; set; }
    public DateTime ChangedAtUtc { get; set; } = DateTime.UtcNow;

    public DentalService DentalService { get; set; } = null!;
}
