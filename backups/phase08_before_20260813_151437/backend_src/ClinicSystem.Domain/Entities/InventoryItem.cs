namespace ClinicSystem.Domain.Entities;

public sealed class InventoryItem
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;

    public decimal CurrentQuantity { get; set; }
    public decimal ReorderLevel { get; set; }
    public decimal AverageUnitCost { get; set; }

    public bool IsActive { get; set; } = true;

    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<InventoryTransaction> Transactions { get; set; }
        = new List<InventoryTransaction>();
}
