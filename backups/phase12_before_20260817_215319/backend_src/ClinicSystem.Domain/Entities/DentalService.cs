namespace ClinicSystem.Domain.Entities;

public sealed class DentalService
{
    public Guid Id { get; set; }

    public string Code { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string? NameEn { get; set; }

    public decimal CurrentPrice { get; set; }
    public string? PricingNoteAr { get; set; }

    public bool IsActive { get; set; } = true;

    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public Guid? UpdatedByUserId { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<DentalServicePriceHistory> PriceHistory { get; set; }
        = new List<DentalServicePriceHistory>();
}
