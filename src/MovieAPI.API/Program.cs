using System.Globalization;
using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.OpenApi.Models;
using MovieAPI.API.Middleware;
using MovieAPI.Application.Interfaces;
using MovieAPI.Application.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole();
builder.Logging.AddFilter("Microsoft.AspNetCore", LogLevel.Warning);

builder.Services.AddHttpClient<IMovieService, MovieService>().RemoveAllLoggers();

var onRender = builder.Configuration.GetValue<bool>("RENDER");
var renderHost = builder.Configuration["RENDER_EXTERNAL_HOSTNAME"];
var renderRevision = builder.Configuration["RENDER_GIT_COMMIT"];
var allowedOrigins = (builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
    .Select(origin => origin.Trim().TrimEnd('/'))
    .Where(origin => origin.Length > 0)
    .ToArray();

if (builder.Environment.IsDevelopment() && allowedOrigins.Length == 0)
    allowedOrigins = ["http://localhost:5173", "https://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("CatalogOrigin", policy => policy
        .WithOrigins(allowedOrigins)
        .WithMethods(HttpMethods.Get)
        .AllowAnyHeader());
});

builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("catalog", context => RateLimitPartition.GetFixedWindowLimiter(
        GetClientAddress(context, onRender ? renderHost : null),
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 100,
            Window = TimeSpan.FromMinutes(1)
        }));

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = (context, cancellationToken) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter =
                Math.Ceiling(retryAfter.TotalSeconds).ToString(CultureInfo.InvariantCulture);
        }

        return new ValueTask(context.HttpContext.Response.WriteAsJsonAsync(
            new { message = "Muitas solicitações. Aguarde um momento e tente novamente." },
            cancellationToken));
    };
});

builder.Services.AddHealthChecks();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options => options.SwaggerDoc("v1", new OpenApiInfo
{
    Title = "CineSearch API",
    Version = "v1",
    Description = "Busca, descoberta e detalhes de filmes e séries via TMDB."
}));

var app = builder.Build();

// Render terminates TLS before forwarding requests to Kestrel.
if (!onRender)
{
    if (!app.Environment.IsDevelopment())
        app.UseHsts();

    app.UseHttpsRedirection();
}

app.UseMiddleware<RequestLoggingMiddleware>();
app.UseMiddleware<ExceptionMiddleware>();

app.Use(async (context, next) =>
{
    context.Response.Headers.XContentTypeOptions = "nosniff";
    context.Response.Headers.XFrameOptions = "DENY";
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.Append("Permissions-Policy", "geolocation=(), microphone=()");

    await next();
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("CatalogOrigin");
app.UseRateLimiter();

app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = (context, report) => context.Response.WriteAsJsonAsync(new
    {
        status = report.Status.ToString(),
        checks = report.Entries.Select(entry => new
        {
            name = entry.Key,
            status = entry.Value.Status.ToString(),
            description = entry.Value.Description,
            duration = entry.Value.Duration.TotalMilliseconds
        }),
        totalDuration = report.TotalDuration.TotalMilliseconds,
        commit = renderRevision
    })
});

app.MapControllers();
app.Run();

static string GetClientAddress(HttpContext context, string? renderHost)
{
    var address = context.Connection.RemoteIpAddress;

    // The public Render ingress overwrites this header. Other hosts use the socket address.
    if (!string.IsNullOrWhiteSpace(renderHost) &&
        string.Equals(context.Request.Host.Host, renderHost, StringComparison.OrdinalIgnoreCase) &&
        context.Request.Headers.TryGetValue("CF-Connecting-IP", out var forwarded) &&
        forwarded.Count == 1 &&
        IPAddress.TryParse(forwarded[0], out var clientAddress))
    {
        address = clientAddress;
    }

    return (address?.IsIPv4MappedToIPv6 == true ? address.MapToIPv4() : address)?.ToString() ?? "unknown";
}

public partial class Program
{
}
