namespace ClinicSystem.Api.Middleware;

public sealed class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(
        RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(
        HttpContext context)
    {
        context.Response.OnStarting(
            () =>
            {
                var headers =
                    context.Response.Headers;

                headers["X-Content-Type-Options"] =
                    "nosniff";

                headers["X-Frame-Options"] =
                    "DENY";

                headers["Referrer-Policy"] =
                    "no-referrer";

                headers["Permissions-Policy"] =
                    "camera=(), microphone=(), geolocation=()";

                headers["Cross-Origin-Opener-Policy"] =
                    "same-origin";

                headers["Content-Security-Policy"] =
                    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";

                headers["Cache-Control"] =
                    "no-store";

                headers["Pragma"] =
                    "no-cache";

                return Task.CompletedTask;
            });

        await _next(context);
    }
}
