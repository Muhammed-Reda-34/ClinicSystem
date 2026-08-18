using ClinicSystem.Infrastructure.Audit;
using ClinicSystem.Infrastructure.Approvals;
using ClinicSystem.Infrastructure.Background;
using ClinicSystem.Infrastructure.Finance;
using ClinicSystem.Infrastructure.Inventory;
using ClinicSystem.Infrastructure.Lab;
using ClinicSystem.Infrastructure.PatientFiles;
using ClinicSystem.Infrastructure.Settings;
using ClinicSystem.Infrastructure.Operations;
using ClinicSystem.Infrastructure.Profile;
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
        services.AddScoped<ApprovalService>();
        services.AddScoped<DoctorProfilePhotoService>();

        services.AddHostedService<
            ClinicMaintenanceHostedService>();

        return services;
    }
}
