using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Domain.Entities;

public sealed class InventoryTransaction
{
    public Guid Id { get; set; }
    public Guid InventoryItemId { get; set; }

    public InventoryTransactionType Type { get; set; }
    public decimal Quantity { get; set; }

    public decimal QuantityBefore { get; set; }
    public decimal QuantityAfter { get; set; }

    public decimal UnitCostSnapshot { get; set; }
    public string? Notes { get; set; }

    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public InventoryItem InventoryItem { get; set; } = null!;
}
