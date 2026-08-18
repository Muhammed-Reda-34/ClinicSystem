using ClinicSystem.Domain.Enums;

namespace ClinicSystem.Infrastructure.Inventory;

public sealed record InventoryItemDto(
    Guid Id,
    string Name,
    string Category,
    string Unit,
    decimal CurrentQuantity,
    decimal ReorderLevel,
    decimal AverageUnitCost,
    bool IsLowStock,
    bool IsActive
);

public sealed record InventoryTransactionDto(
    Guid Id,
    Guid InventoryItemId,
    string ItemName,
    InventoryTransactionType Type,
    decimal Quantity,
    decimal QuantityBefore,
    decimal QuantityAfter,
    decimal UnitCostSnapshot,
    decimal EstimatedCost,
    string? Notes,
    Guid CreatedByUserId,
    DateTime CreatedAtUtc
);

public sealed record CreateInventoryItemCommand(
    string Name,
    string Category,
    string Unit,
    decimal OpeningQuantity,
    decimal ReorderLevel,
    decimal AverageUnitCost
);

public sealed record UpdateInventoryItemCommand(
    string Name,
    string Category,
    string Unit,
    decimal ReorderLevel,
    decimal AverageUnitCost,
    bool IsActive
);

public sealed record RecordInventoryTransactionCommand(
    InventoryTransactionType Type,
    decimal Quantity,
    decimal? UnitCost,
    string? Notes
);

public sealed record InventoryWriteResult(
    bool Succeeded,
    string? ErrorCode,
    string? ErrorMessage,
    Guid? Id
);
