using ClinicSystem.Infrastructure.Appointments;
using ClinicSystem.Infrastructure.MedicalRecords;
using ClinicSystem.Infrastructure.PreliminaryBookings;
using ClinicSystem.Infrastructure.Services;
using ClinicSystem.Infrastructure.Visits;
using Microsoft.Extensions.DependencyInjection;

namespace ClinicSystem.Infrastructure;

public static class ClinicalDependencyInjection
{
    public static IServiceCollection AddClinicalModules(
        this IServiceCollection services)
    {
        services.AddScoped<PatientMedicalService>();
        services.AddScoped<AppointmentService>();
        services.AddScoped<PreliminaryBookingService>();
        services.AddScoped<DentalServiceService>();
        services.AddScoped<VisitService>();

        return services;
    }
}
