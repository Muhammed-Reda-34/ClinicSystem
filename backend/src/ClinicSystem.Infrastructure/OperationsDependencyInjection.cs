using ClinicSystem.Infrastructure.Audit;
using ClinicSystem.Infrastructure.Finance;
using ClinicSystem.Infrastructure.Inventory;
using ClinicSystem.Infrastructure.Lab;
using ClinicSystem.Infrastructure.PatientFiles;
using ClinicSystem.Infrastructure.Settings;
using ClinicSystem.Infrastructure.Operations;
using Microsoft.Extensions.DependencyInjection;

namespace ClinicSystem.Infrastructure;

public static class OperationsDependencyInjection
{
    public static IServiceCollection AddOperationsModules(
        this IServiceCollection services)
    {
        services.AddScoped<AccountingPeriodGuard>();
        services.AddScoped<InventoryService>();
        services.AddScoped<LabService>();
        services.AddScoped<FinanceService>();
        services.AddScoped<PatientFileService>();
        services.AddScoped<AuditLogQueryService>();
        services.AddScoped<ClinicSettingsService>();
        services.AddScoped<OperationsService>();

        return services;
    }
}
