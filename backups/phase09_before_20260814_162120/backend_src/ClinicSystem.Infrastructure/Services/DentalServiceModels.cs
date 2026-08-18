namespace ClinicSystem.Infrastructure.Services;

public sealed record DentalServiceDto(
    Guid Id,
    string Code,
    string Category,
    string NameAr,
    string? NameEn,
    decimal CurrentPrice,
    string? PricingNoteAr,
    bool IsActive,
    DateTime UpdatedAtUtc
);

public sealed record DentalServicePriceHistoryDto(
    Guid Id,
    decimal OldPrice,
    decimal NewPrice,
    Guid ChangedByUserId,
    DateTime ChangedAtUtc
);

public sealed record CreateDentalServiceCommand(
    string Category,
    string NameAr,
    string? NameEn,
    decimal CurrentPrice,
    string? PricingNoteAr
);

public sealed record UpdateDentalServiceCommand(
    string Category,
    string NameAr,
    string? NameEn,
    decimal CurrentPrice,
    string? PricingNoteAr,
    bool IsActive
);
