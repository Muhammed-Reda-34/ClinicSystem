using System.Security.Cryptography;
using ClinicSystem.Domain.Entities;
using ClinicSystem.Infrastructure.Audit;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.Services;

public sealed class DentalServiceService
{
    private readonly ClinicDbContext _db;
    private readonly AuditService _audit;

    public DentalServiceService(
        ClinicDbContext db,
        AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<IReadOnlyCollection<DentalServiceDto>> GetAsync(
        bool includeInactive,
        CancellationToken cancellationToken)
    {
        var query = _db.DentalServices.AsNoTracking();

        if (!includeInactive)
        {
            query = query.Where(x => x.IsActive);
        }

        return await query
            .OrderBy(x => x.Category)
            .ThenBy(x => x.NameAr)
            .Select(x => new DentalServiceDto(
                x.Id,
                x.Code,
                x.Category,
                x.NameAr,
                x.NameEn,
                x.CurrentPrice,
                x.PricingNoteAr,
                x.IsActive,
                x.UpdatedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<DentalServicePriceHistoryDto>>
        GetPriceHistoryAsync(
            Guid serviceId,
            CancellationToken cancellationToken)
    {
        return await _db.DentalServicePriceHistory
            .AsNoTracking()
            .Where(x => x.DentalServiceId == serviceId)
            .OrderByDescending(x => x.ChangedAtUtc)
            .Select(x => new DentalServicePriceHistoryDto(
                x.Id,
                x.OldPrice,
                x.NewPrice,
                x.ChangedByUserId,
                x.ChangedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<Guid> CreateAsync(
        CreateDentalServiceCommand command,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        if (command.CurrentPrice < 0)
        {
            throw new InvalidOperationException(
                "Price cannot be negative.");
        }

        var service = new DentalService
        {
            Id = Guid.NewGuid(),
            Code =
                $"SRV-{RandomNumberGenerator.GetHexString(8)}",
            Category = command.Category.Trim(),
            NameAr = command.NameAr.Trim(),
            NameEn = CleanOptional(command.NameEn),
            CurrentPrice = command.CurrentPrice,
            PricingNoteAr =
                CleanOptional(command.PricingNoteAr),
            IsActive = true,
            CreatedByUserId = actorUserId,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        _db.DentalServices.Add(service);

        _audit.Add(
            actorUserId,
            "DentalServiceCreated",
            nameof(DentalService),
            service.Id.ToString(),
            null,
            new
            {
                service.Code,
                service.Category,
                service.NameAr,
                service.NameEn,
                service.CurrentPrice,
                service.PricingNoteAr
            },
            ipAddress);

        await _db.SaveChangesAsync(cancellationToken);

        return service.Id;
    }

    public async Task<bool> UpdateAsync(
        Guid serviceId,
        UpdateDentalServiceCommand command,
        Guid actorUserId,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        if (command.CurrentPrice < 0)
        {
            throw new InvalidOperationException(
                "Price cannot be negative.");
        }

        var service = await _db.DentalServices
            .SingleOrDefaultAsync(
                x => x.Id == serviceId,
                cancellationToken);

        if (service is null)
        {
            return false;
        }

        var oldValues = new
        {
            service.Category,
            service.NameAr,
            service.NameEn,
            service.CurrentPrice,
            service.PricingNoteAr,
            service.IsActive
        };

        if (service.CurrentPrice != command.CurrentPrice)
        {
            _db.DentalServicePriceHistory.Add(
                new DentalServicePriceHistory
                {
                    Id = Guid.NewGuid(),
                    DentalServiceId = service.Id,
                    OldPrice = service.CurrentPrice,
                    NewPrice = command.CurrentPrice,
                    ChangedByUserId = actorUserId,
                    ChangedAtUtc = DateTime.UtcNow
                });
        }

        service.Category = command.Category.Trim();
        service.NameAr = command.NameAr.Trim();
        service.NameEn = CleanOptional(command.NameEn);
        service.CurrentPrice = command.CurrentPrice;
        service.PricingNoteAr =
            CleanOptional(command.PricingNoteAr);
        service.IsActive = command.IsActive;
        service.UpdatedByUserId = actorUserId;
        service.UpdatedAtUtc = DateTime.UtcNow;

        _audit.Add(
            actorUserId,
            "DentalServiceUpdated",
            nameof(DentalService),
            service.Id.ToString(),
            oldValues,
            new
            {
                service.Category,
                service.NameAr,
                service.NameEn,
                service.CurrentPrice,
                service.PricingNoteAr,
                service.IsActive
            },
            ipAddress);

        await _db.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static string? CleanOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
