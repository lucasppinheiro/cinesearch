using MovieAPI.Application.Services;

namespace MovieAPI.API.Middleware;

public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // The requester disconnected before the response was ready.
        }
        catch (Exception exception) when (!context.Response.HasStarted)
        {
            var tmdbFailure = exception as TmdbRequestException;
            var status = tmdbFailure is null
                ? StatusCodes.Status500InternalServerError
                : (int)tmdbFailure.StatusCode;
            var referenceId = context.TraceIdentifier;

            logger.Log(
                status == StatusCodes.Status404NotFound ? LogLevel.Information : LogLevel.Error,
                "Catalog request {ReferenceId} returned {StatusCode}, operation {Operation}, upstream status {UpstreamStatus}, error {ErrorType}",
                referenceId, status, tmdbFailure?.Operation, tmdbFailure?.UpstreamStatusCode, exception.GetType().Name);

            context.Response.StatusCode = status;
            await context.Response.WriteAsJsonAsync(new
            {
                success = false,
                message = tmdbFailure?.Message ?? "Ocorreu um erro interno no servidor.",
                referenceId,
                details = "Consulte os logs usando o identificador de referência."
            }, context.RequestAborted);
        }
    }
}
