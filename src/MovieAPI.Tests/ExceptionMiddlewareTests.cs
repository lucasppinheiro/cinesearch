using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using MovieAPI.API.Middleware;
using MovieAPI.Application.Services;
using Xunit;

namespace MovieAPI.Tests;

public class ExceptionMiddlewareTests
{
    [Fact]
    public async Task KnownFailureUsesTheSameSafeReferenceInLogsAndResponse()
    {
        var logger = new RecordingLogger();
        var middleware = new ExceptionMiddleware(
            _ => throw new TmdbRequestException(HttpStatusCode.ServiceUnavailable, "Catálogo indisponível."),
            logger);
        var context = new DefaultHttpContext { TraceIdentifier = "catalog-test-reference" };
        using var body = new MemoryStream();
        context.Response.Body = body;

        await middleware.InvokeAsync(context);

        body.Position = 0;
        using var json = await JsonDocument.ParseAsync(body);
        Assert.Equal(503, context.Response.StatusCode);
        Assert.Equal(context.TraceIdentifier, json.RootElement.GetProperty("referenceId").GetString());
        Assert.Contains(context.TraceIdentifier, logger.Message);
    }

    private sealed class RecordingLogger : ILogger<ExceptionMiddleware>
    {
        public string Message { get; private set; } = string.Empty;

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter) => Message = formatter(state, exception);
    }
}
