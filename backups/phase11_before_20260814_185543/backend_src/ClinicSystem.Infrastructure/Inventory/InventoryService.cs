using ClinicSystem.Domain.Entities;
using ClinicSystem.Domain.Enums;
using ClinicSystem.Infrastructure.Audit;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.Inventory;

public sealed class InventoryService
{
    private readonly ClinicDbContext _db;
    private readonly AuditService _audit;
    private readonly ClinicSystem.Infrastructure.Finance.AccountingPeriodGuard _periodGuard;

    public InventoryService(
        ClinicDbContext db,
        AuditService audit,
        ClinicSystem.Infrastructure.Finance.AccountingPeriodGuard periodGuard)
    {
        _db = db;
        _audit = audit;
        _periodGuard = periodGuard;
    }

    public async Task<IReadOnlyCollection<InventoryItemDto>>
        GetItemsAsync(
            bool includeInactive,
            CancellationToken cancellationToken)
    {
        var query =
            _db.InventoryItems
            .AsNoTracking();

        if (!includeInactive)
        {
            query =
                query.Where(
                    x => x.IsActive);
        }

        return await query
            .OrderByDescending(
                x =>
                    x.CurrentQuantity
                    <= x.ReorderLevel)
            .ThenBy(x => x.Category)
            .ThenBy(x => x.Name)
            .Select(
                x => new InventoryItemDto(
                    x.Id,
                    x.Name,
                    x.Category,
                    x.Unit,
                    x.CurrentQuantity,
                    x.ReorderLevel,
                    x.AverageUnitCost,
                    x.CurrentQuantity <= x.ReorderLevel,
                    x.IsActive))
            .ToListAsync(
                cancellationToken);
    }

    public async Task<IReadOnlyCollection<InventoryTransactionDto>>
        GetTransactionsAsync(
            Guid? itemId,
            DateTime? fromUtc,
            DateTime? toUtc,
            int take,
            CancellationToken cancellationToken)
    {
        take = Math.Clamp(take, 10, 500);

        var query =
            _db.InventoryTransactions
            .AsNoTracking()
            .Include(x => x.InventoryItem)
            .AsQueryable();

        if (itemId is not null)
        {
            query = query.Where(
                x =>
                    x.InventoryItemId
                    == itemId.Value);
        }

        if (fromUtc is not null)
        {
            query = query.Where(
                x =>
                    x.CreatedAtUtc
                    >= fromUtc.Value);
        }

        if (toUtc is not null)
        {
            query = query.Where(
                x =>
                    x.CreatedAtUtc
                    < toUtc.Value);
        }

        return await query
            .OrderByDescending(
                x => x.CreatedAtUtc)
            .Take(take)
            .Select(
                x =>
                    new InventoryTransactionDto(
                        x.Id,
                        x.InventoryItemId,
                        x.InventoryItem.Name,
                        x.Type,
                        x.Quantity,
                        x.QuantityBefore,
                        x.QuantityAfter,
                        x.UnitCostSnapshot,
                        x.Quantity
                            * x.UnitCostSnapshot,
                        x.Notes,
                        x.CreatedByUserId,
                        x.CreatedAtUtc))
            .ToListAsync(
                cancellationToken);
    }

    public async Task<InventoryWriteResult>
        CreateItemAsync(
            CreateInventoryItemCommand command,
            Guid actorUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        var name = command.Name.Trim();
        var category =
            command.Category.Trim();
        var unit = command.Unit.Trim();

        if (
            string.IsNullOrWhiteSpace(name)
            || string.IsNullOrWhiteSpace(category)
            || string.IsNullOrWhiteSpace(unit)
        )
        {
            return Fail(
                "INVALID_ITEM",
                "Name, category and unit are required.");
        }

        if (
            command.OpeningQuantity < 0
            || command.ReorderLevel < 0
            || command.AverageUnitCost < 0
        )
        {
            return Fail(
                "INVALID_AMOUNT",
                "Quantities and costs cannot be negative.");
        }

        var exists =
            await _db.InventoryItems
            .AnyAsync(
                x =>
                    x.Name.ToLower()
                    == name.ToLower()
                    && x.Category.ToLower()
                    == category.ToLower(),
                cancellationToken);

        if (exists)
        {
            return Fail(
                "ITEM_EXISTS",
                "Inventory item already exists.");
        }

        await using var transaction =
            await _db.Database
            .BeginTransactionAsync(
                cancellationToken);

        var item =
            new InventoryItem
            {
                Id = Guid.NewGuid(),
                Name = name,
                Category = category,
                Unit = unit,
                CurrentQuantity =
                    command.OpeningQuantity,
                ReorderLevel =
                    command.ReorderLevel,
                AverageUnitCost =
                    command.AverageUnitCost,
                IsActive = true,
                CreatedByUserId =
                    actorUserId,
                CreatedAtUtc =
                    DateTime.UtcNow,
                UpdatedAtUtc =
                    DateTime.UtcNow
            };

        _db.InventoryItems.Add(item);

        if (command.OpeningQuantity > 0)
        {
            _db.InventoryTransactions.Add(
                new InventoryTransaction
                {
                    Id = Guid.NewGuid(),
                    InventoryItemId = item.Id,
                    Type =
                        InventoryTransactionType
                        .StockIn,
                    Quantity =
                        command.OpeningQuantity,
                    QuantityBefore = 0,
                    QuantityAfter =
                        command.OpeningQuantity,
                    UnitCostSnapshot =
                        command.AverageUnitCost,
                    Notes = "Opening stock",
                    CreatedByUserId =
                        actorUserId,
                    CreatedAtUtc =
                        DateTime.UtcNow
                });
        }

        _audit.Add(
            actorUserId,
            "InventoryItemCreated",
            nameof(InventoryItem),
            item.Id.ToString(),
            null,
            new
            {
                item.Name,
                item.Category,
                item.Unit,
                item.CurrentQuantity,
                item.ReorderLevel,
                item.AverageUnitCost
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        await transaction.CommitAsync(
            cancellationToken);

        return new InventoryWriteResult(
            true,
            null,
            null,
            item.Id);
    }

    public async Task<InventoryWriteResult>
        UpdateItemAsync(
            Guid itemId,
            UpdateInventoryItemCommand command,
            Guid actorUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        var item =
            await _db.InventoryItems
            .SingleOrDefaultAsync(
                x => x.Id == itemId,
                cancellationToken);

        if (item is null)
        {
            return Fail(
                "NOT_FOUND",
                "Inventory item was not found.");
        }

        if (
            command.ReorderLevel < 0
            || command.AverageUnitCost < 0
        )
        {
            return Fail(
                "INVALID_AMOUNT",
                "Reorder level and unit cost cannot be negative.");
        }

        var oldValues =
            new
            {
                item.Name,
                item.Category,
                item.Unit,
                item.ReorderLevel,
                item.AverageUnitCost,
                item.IsActive
            };

        item.Name =
            command.Name.Trim();
        item.Category =
            command.Category.Trim();
        item.Unit =
            command.Unit.Trim();
        item.ReorderLevel =
            command.ReorderLevel;
        item.AverageUnitCost =
            command.AverageUnitCost;
        item.IsActive =
            command.IsActive;
        item.UpdatedAtUtc =
            DateTime.UtcNow;

        _audit.Add(
            actorUserId,
            "InventoryItemUpdated",
            nameof(InventoryItem),
            item.Id.ToString(),
            oldValues,
            new
            {
                item.Name,
                item.Category,
                item.Unit,
                item.ReorderLevel,
                item.AverageUnitCost,
                item.IsActive
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return new InventoryWriteResult(
            true,
            null,
            null,
            item.Id);
    }

    public async Task<InventoryWriteResult>
        RecordTransactionAsync(
            Guid itemId,
            RecordInventoryTransactionCommand command,
            Guid actorUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        if (command.Quantity <= 0)
        {
            return Fail(
                "INVALID_QUANTITY",
                "Quantity must be greater than zero.");
        }

        if (
            !await _periodGuard.IsOpenAsync(
                DateTime.UtcNow,
                cancellationToken)
        )
        {
            return Fail(
                "ACCOUNTING_PERIOD_CLOSED",
                "Current accounting period is closed.");
        }

        if (
            command.UnitCost is not null
            && command.UnitCost.Value < 0
        )
        {
            return Fail(
                "INVALID_COST",
                "Unit cost cannot be negative.");
        }

        await using var transaction =
            await _db.Database
            .BeginTransactionAsync(
                cancellationToken);

        var item =
            await _db.InventoryItems
            .SingleOrDefaultAsync(
                x =>
                    x.Id == itemId
                    && x.IsActive,
                cancellationToken);

        if (item is null)
        {
            return Fail(
                "NOT_FOUND",
                "Inventory item was not found.");
        }

        var before =
            item.CurrentQuantity;

        decimal after;

        switch (command.Type)
        {
            case InventoryTransactionType.StockIn:
            case InventoryTransactionType.AdjustmentIncrease:
                after =
                    before
                    + command.Quantity;
                break;

            case InventoryTransactionType.Consumption:
            case InventoryTransactionType.AdjustmentDecrease:
                after =
                    before
                    - command.Quantity;

                if (after < 0)
                {
                    return Fail(
                        "INSUFFICIENT_STOCK",
                        "Transaction would make stock negative.");
                }

                break;

            default:
                return Fail(
                    "INVALID_TYPE",
                    "Inventory transaction type is invalid.");
        }

        var unitCost =
            command.UnitCost
            ?? item.AverageUnitCost;

        if (
            command.Type
            == InventoryTransactionType.StockIn
            && command.UnitCost is not null
        )
        {
            var oldStockValue =
                before
                * item.AverageUnitCost;

            var addedValue =
                command.Quantity
                * command.UnitCost.Value;

            var totalQuantity =
                before
                + command.Quantity;

            item.AverageUnitCost =
                totalQuantity > 0
                    ? (
                        oldStockValue
                        + addedValue
                    ) / totalQuantity
                    : command.UnitCost.Value;

            unitCost =
                command.UnitCost.Value;
        }

        item.CurrentQuantity =
            after;
        item.UpdatedAtUtc =
            DateTime.UtcNow;

        var inventoryTransaction =
            new InventoryTransaction
            {
                Id = Guid.NewGuid(),
                InventoryItemId = item.Id,
                Type = command.Type,
                Quantity = command.Quantity,
                QuantityBefore = before,
                QuantityAfter = after,
                UnitCostSnapshot = unitCost,
                Notes =
                    CleanOptional(
                        command.Notes),
                CreatedByUserId =
                    actorUserId,
                CreatedAtUtc =
                    DateTime.UtcNow
            };

        _db.InventoryTransactions
            .Add(inventoryTransaction);

        _audit.Add(
            actorUserId,
            "InventoryTransactionRecorded",
            nameof(InventoryTransaction),
            inventoryTransaction
                .Id.ToString(),
            null,
            new
            {
                item.Id,
                item.Name,
                command.Type,
                command.Quantity,
                QuantityBefore = before,
                QuantityAfter = after,
                UnitCost = unitCost
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        await transaction.CommitAsync(
            cancellationToken);

        return new InventoryWriteResult(
            true,
            null,
            null,
            inventoryTransaction.Id);
    }

    private static InventoryWriteResult Fail(
        string code,
        string message)
    {
        return new InventoryWriteResult(
            false,
            code,
            message,
            null);
    }

    private static string? CleanOptional(
        string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
