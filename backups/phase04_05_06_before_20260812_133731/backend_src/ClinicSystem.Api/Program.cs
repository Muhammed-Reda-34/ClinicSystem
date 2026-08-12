using System.Threading.RateLimiting;
using ClinicSystem.Api.Middleware;
using ClinicSystem.Infrastructure;
using ClinicSystem.Infrastructure.Identity;
using ClinicSystem.Infrastructure.Services;

var builder =
    WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(
    options =>
    {
        options.AddServerHeader = false;

        options.Limits.MaxRequestBodySize =
            10 * 1024 * 1024;
    });

builder.Services.AddInfrastructure(
    builder.Configuration);

builder.Services.AddClinicalModules();

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

var allowedOrigins =
    builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>()
    ?? ["http://localhost:5173"];

builder.Services.AddCors(
    options =>
    {
        options.AddPolicy(
            "Frontend",
            policy =>
            {
                policy
                    .WithOrigins(allowedOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
            });
    });

builder.Services.AddRateLimiter(
    options =>
    {
        options.RejectionStatusCode =
            StatusCodes.Status429TooManyRequests;

        options.AddPolicy(
            "auth",
            httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey:
                        httpContext.Connection.RemoteIpAddress?.ToString()
                        ?? "unknown",
                    factory:
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 20,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                            AutoReplenishment = true
                        }));

        options.AddPolicy(
            "api",
            httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey:
                        httpContext.User.Identity?.Name
                        ?? httpContext.Connection.RemoteIpAddress?.ToString()
                        ?? "anonymous",
                    factory:
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 300,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                            AutoReplenishment = true
                        }));
    });

var app = builder.Build();

app.UseExceptionHandler();
app.UseMiddleware<SecurityHeadersMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseCors("Frontend");

app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.MapGet(
    "/",
    () =>
        Results.Ok(
            new
            {
                name = "Blue Dahab Clinic API",
                status = "running"
            }))
    .AllowAnonymous();

app.MapControllers();

await app.Services.SeedBootstrapOwnerAsync(
    app.Configuration);

await app.Services.SeedReferenceDentalServicesAsync();

app.Run();
