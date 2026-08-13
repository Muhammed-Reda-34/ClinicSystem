using ClinicSystem.Domain.Entities;
using ClinicSystem.Infrastructure.Audit;
using ClinicSystem.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicSystem.Infrastructure.Settings;

public sealed class ClinicSettingsService
{
    private readonly ClinicDbContext _db;
    private readonly AuditService _audit;

    public ClinicSettingsService(
        ClinicDbContext db,
        AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<ClinicSettingDto>
        GetAsync(
            CancellationToken cancellationToken)
    {
        var entity =
            await GetOrCreateEntityAsync(
                cancellationToken);

        return Map(entity);
    }

    public async Task<ClinicSettingDto>
        UpdateAsync(
            UpdateClinicSettingCommand command,
            Guid actorUserId,
            string? ipAddress,
            CancellationToken cancellationToken)
    {
        var entity =
            await GetOrCreateEntityAsync(
                cancellationToken);

        var oldValues =
            new
            {
                entity.ClinicName,
                entity.HeaderInvocationAr,
                entity.CurrencyCode,
                entity.AppointmentReminderTemplateAr,
                entity.AppointmentReminderTemplateEn
            };

        entity.ClinicName =
            command.ClinicName.Trim();

        entity.HeaderInvocationAr =
            command.HeaderInvocationAr.Trim();

        entity.CurrencyCode =
            command.CurrencyCode
                .Trim()
                .ToUpperInvariant();

        entity.AppointmentReminderTemplateAr =
            command.AppointmentReminderTemplateAr
                .Trim();

        entity.AppointmentReminderTemplateEn =
            command.AppointmentReminderTemplateEn
                .Trim();

        entity.UpdatedByUserId =
            actorUserId;

        entity.UpdatedAtUtc =
            DateTime.UtcNow;

        _audit.Add(
            actorUserId,
            "ClinicSettingsUpdated",
            nameof(ClinicSetting),
            entity.Id.ToString(),
            oldValues,
            new
            {
                entity.ClinicName,
                entity.HeaderInvocationAr,
                entity.CurrencyCode,
                entity.AppointmentReminderTemplateAr,
                entity.AppointmentReminderTemplateEn
            },
            ipAddress);

        await _db.SaveChangesAsync(
            cancellationToken);

        return Map(entity);
    }

    private async Task<ClinicSetting>
        GetOrCreateEntityAsync(
            CancellationToken cancellationToken)
    {
        var entity =
            await _db.ClinicSettings
            .SingleOrDefaultAsync(
                cancellationToken);

        if (entity is not null)
        {
            return entity;
        }

        entity =
            new ClinicSetting
            {
                Id = Guid.Parse(
                    "70000000-0000-0000-0000-000000000001")
            };

        _db.ClinicSettings.Add(entity);

        await _db.SaveChangesAsync(
            cancellationToken);

        return entity;
    }

    private static ClinicSettingDto Map(
        ClinicSetting entity)
    {
        return new ClinicSettingDto(
            entity.Id,
            entity.ClinicName,
            entity.HeaderInvocationAr,
            entity.CurrencyCode,
            entity.AppointmentReminderTemplateAr,
            entity.AppointmentReminderTemplateEn,
            entity.UpdatedAtUtc);
    }
}
