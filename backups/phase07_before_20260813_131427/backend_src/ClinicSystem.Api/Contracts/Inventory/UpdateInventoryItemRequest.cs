using System.ComponentModel.DataAnnotations;

namespace ClinicSystem.Api.Contracts.Inventory;

public sealed class UpdateInventoryItemRequest
{
    [Required, MaxLength(250)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(150)]
    public string Category { get; set; } = string.Empty;

    [Required, MaxLength(80)]
    public string Unit { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public decimal ReorderLevel { get; set; }

    [Range(0, double.MaxValue)]
    public decimal AverageUnitCost { get; set; }

    public bool IsActive { get; set; } = true;
}
