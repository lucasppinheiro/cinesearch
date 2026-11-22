using System.Diagnostics;
using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MovieAPI.Application.Interfaces;
using MovieAPI.Application.Services;
using Xunit;
using Xunit.Abstractions;

namespace MovieAPI.Tests;

public class CatalogHttpTests(ITestOutputHelper output)
{
    private const string Frontend = "https://cinesearch-jet.vercel.app";
    private const string RenderHost = "cinesearch-api-61a5.onrender.com";
    private const string Commit = "cinesearch-test-revision";

    [Fact]
    public async Task CatalogReturnsPaginationAndCorsForThePublishedFrontend()
    {
        using var app = CreateApp();
        using var client = CreateClient(app);
        client.DefaultRequestHeaders.Add("Origin", Frontend);

        using var response = await client.GetAsync("/api/movies/discover?type=tv&page=2");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(Frontend, Assert.Single(response.Headers.GetValues("Access-Control-Allow-Origin")));
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(2, json.RootElement.GetProperty("page").GetInt32());
        Assert.Equal(3, json.RootElement.GetProperty("total_pages").GetInt32());
        Assert.Equal("tv", json.RootElement.GetProperty("results")[0].GetProperty("media_type").GetString());

        client.DefaultRequestHeaders.Remove("Origin");
        client.DefaultRequestHeaders.Add("Origin", "http://localhost:5173");
        using var otherOrigin = await client.GetAsync("/api/movies/discover");
        Assert.False(otherOrigin.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task ConcurrentRequestsRespectTheClientLimitAndLeaveHealthAvailable()
    {
        using var app = CreateApp();
        app.UseKestrel(0);
        app.StartServer();
        var addresses = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!;
        var address = new Uri(Assert.Single(addresses.Addresses));
        using var firstClient = CreateClient(app, address);
        firstClient.DefaultRequestHeaders.Add("CF-Connecting-IP", "192.0.2.1");
        using var secondClient = CreateClient(app, address);
        secondClient.DefaultRequestHeaders.Add("CF-Connecting-IP", "192.0.2.2");

        var measurements = new (HttpStatusCode Status, bool HasRetryAfter, double Milliseconds)[105];
        await Parallel.ForEachAsync(
            Enumerable.Range(0, measurements.Length),
            new ParallelOptions { MaxDegreeOfParallelism = 8 },
            async (index, cancellationToken) =>
            {
                var started = Stopwatch.GetTimestamp();
                using var response = await firstClient.GetAsync("/api/movies/discover", cancellationToken);
                measurements[index] = (
                    response.StatusCode,
                    response.Headers.RetryAfter?.Delta > TimeSpan.Zero,
                    Stopwatch.GetElapsedTime(started).TotalMilliseconds);
            });

        Assert.Equal(100, measurements.Count(result => result.Status == HttpStatusCode.OK));
        Assert.Equal(5, measurements.Count(result => result.Status == HttpStatusCode.TooManyRequests && result.HasRetryAfter));
        var durations = measurements.Select(result => result.Milliseconds).Order().ToArray();
        output.WriteLine($"Kestrel /discover with simulated TMDB, 105 requests, concurrency 8, p95 {durations[99]:F1} ms.");

        using var secondResponse = await secondClient.GetAsync("/api/movies/discover");
        Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);
        using var healthResponse = await firstClient.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, healthResponse.StatusCode);
        using var health = JsonDocument.Parse(await healthResponse.Content.ReadAsStringAsync());
        Assert.Equal(Commit, health.RootElement.GetProperty("commit").GetString());
    }

    private static WebApplicationFactory<Program> CreateApp() =>
        new CatalogApp();

    private static HttpClient CreateClient(WebApplicationFactory<Program> app, Uri? address = null)
    {
        var client = app.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            BaseAddress = address ?? app.ClientOptions.BaseAddress
        });
        client.DefaultRequestHeaders.Host = RenderHost;
        return client;
    }

    private sealed class CatalogApp : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Production");
            builder.ConfigureLogging(logging => logging.AddFilter("MovieAPI.API.Middleware.RequestLoggingMiddleware", LogLevel.Warning));
            builder.UseSetting("RENDER", "true");
            builder.UseSetting("RENDER_EXTERNAL_HOSTNAME", RenderHost);
            builder.UseSetting("RENDER_GIT_COMMIT", Commit);
            builder.UseSetting("Cors:AllowedOrigins:0", Frontend);
            builder.UseSetting("TmdbSettings:ApiKey", "integration-test-key");
            builder.UseSetting("TmdbSettings:BaseUrl", "https://tmdb.invalid/3/");
            builder.ConfigureTestServices(services => services
                .AddHttpClient<IMovieService, MovieService>()
                .ConfigurePrimaryHttpMessageHandler(() => new CatalogHandler()));
        }
    }

    private sealed class CatalogHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var page = request.RequestUri!.Query.Contains("page=2", StringComparison.Ordinal) ? 2 : 1;
            var content = $$"""
                {"page":{{page}},"total_pages":3,"total_results":42,"results":[{"id":1396,"name":"Breaking Bad"}]}
                """;

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(content, Encoding.UTF8, "application/json")
            });
        }
    }
}
