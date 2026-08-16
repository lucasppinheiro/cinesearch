using System.Net;
using System.Text.Json;
using MovieAPI.Application.Services;

namespace MovieAPI.API.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;
    private readonly IWebHostEnvironment _env;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger, IWebHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro não tratado: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex, _env);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception, IWebHostEnvironment env)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = exception is TmdbRequestException tmdbException
            ? (int)tmdbException.StatusCode
            : (int)HttpStatusCode.InternalServerError;

        var referenceId = Guid.NewGuid().ToString("N");

        var response = new
        {
            Success = false,
            Message = exception is TmdbRequestException ? exception.Message : "Ocorreu um erro interno no servidor.",
            ReferenceId = referenceId,
            Details = env.IsDevelopment() ? exception.Message : "Detalhes omitidos por segurança. Consulte os logs usando o ReferenceId."
        };

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}
