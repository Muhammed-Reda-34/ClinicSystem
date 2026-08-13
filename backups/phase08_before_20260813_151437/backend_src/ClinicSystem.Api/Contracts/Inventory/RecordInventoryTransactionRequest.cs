using System.ComponentModel.DataAnnotations;
using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Api.Contracts.Inventory;

public sealed class RecordInventoryTransactionRequest
{
    public InventoryTransactionType Type { get; set; }

    [Range(0.001, double.MaxValue)]
    public decimal Quantity { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? UnitCost { get; set; }

    [MaxLength(1500)]
    public string? Notes { get; set; }
}
