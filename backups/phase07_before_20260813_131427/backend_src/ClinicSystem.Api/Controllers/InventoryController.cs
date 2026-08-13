using ClinicSystem.Api.Common;
using ClinicSystem.Api.Contracts.Inventory;
using ClinicSystem.Infrastructure.Inventory;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ClinicSystem.Api.Controllers;

[ApiController]
[Route("api/v1/inventory")]
[Authorize]
[EnableRateLimiting("api")]
public sealed class InventoryController : ControllerBase
{
    private readonly InventoryService _service;

    public InventoryController(
        InventoryService service)
    {
        _service = service;
    }

    [HttpGet]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> GetItems(
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        return Ok(
            await _service.GetItemsAsync(
                includeInactive,
                cancellationToken));
    }

    [HttpGet("transactions")]
    [Authorize(Roles = "Owner,Doctor,Secretary,Nurse")]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] Guid? itemId,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] int take = 100,
        CancellationToken cancellationToken = default)
    {
        return Ok(
            await _service.GetTransactionsAsync(
                itemId,
                fromUtc,
                toUtc,
                take,
                cancellationToken));
    }

    [HttpPost]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> CreateItem(
        CreateInventoryItemRequest request,
        CancellationToken cancellationToken)
    {
        var result =
            await _service.CreateItemAsync(
                new CreateInventoryItemCommand(
                    request.Name,
                    request.Category,
                    request.Unit,
                    request.OpeningQuantity,
                    request.ReorderLevel,
                    request.AverageUnitCost),
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        return result.Succeeded
            ? Created(
                $"/api/v1/inventory/{result.Id}",
                new { id = result.Id })
            : BadRequest(
                new
                {
                    code = result.ErrorCode,
                    message = result.ErrorMessage
                });
    }

    [HttpPut("{itemId:guid}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> UpdateItem(
        Guid itemId,
        UpdateInventoryItemRequest request,
        CancellationToken cancellationToken)
    {
        var result =
            await _service.UpdateItemAsync(
                itemId,
                new UpdateInventoryItemCommand(
                    request.Name,
                    request.Category,
                    request.Unit,
                    request.ReorderLevel,
                    request.AverageUnitCost,
                    request.IsActive),
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        if (!result.Succeeded)
        {
            return result.ErrorCode == "NOT_FOUND"
                ? NotFound()
                : BadRequest(
                    new
                    {
                        code = result.ErrorCode,
                        message = result.ErrorMessage
                    });
        }

        return NoContent();
    }

    [HttpPost("{itemId:guid}/transactions")]
    [Authorize(Roles = "Owner,Secretary,Nurse")]
    public async Task<IActionResult> RecordTransaction(
        Guid itemId,
        RecordInventoryTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var result =
            await _service.RecordTransactionAsync(
                itemId,
                new RecordInventoryTransactionCommand(
                    request.Type,
                    request.Quantity,
                    request.UnitCost,
                    request.Notes),
                User.GetUserIdOrThrow(),
                GetClientIp(),
                cancellationToken);

        return result.Succeeded
            ? Created(
                $"/api/v1/inventory/transactions/{result.Id}",
                new { id = result.Id })
            : BadRequest(
                new
                {
                    code = result.ErrorCode,
                    message = result.ErrorMessage
                });
    }

    private string? GetClientIp() =>
        HttpContext.Connection.RemoteIpAddress?.ToString();
}
