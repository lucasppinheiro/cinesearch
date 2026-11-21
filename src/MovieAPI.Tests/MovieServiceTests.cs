using System.Net;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using MovieAPI.Application.DTOs.Movie;
using MovieAPI.Application.Services;
using Xunit;

namespace MovieAPI.Tests;

public class MovieServiceTests
{
    [Fact]
    public async Task SearchMoviesAsync_sends_type_query_and_page_to_tmdb()
    {
        var handler = new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("{\"page\":2,\"results\":[],\"total_results\":0}", Encoding.UTF8, "application/json")
        });
        var service = CreateService(handler);

        var response = await service.SearchMoviesAsync("Duna", 2, "movie");

        response.Page.Should().Be(2);
        handler.LastRequest!.RequestUri!.ToString().Should().Contain("search/movie").And.Contain("query=Duna").And.Contain("page=2");
    }

    [Fact]
    public async Task DiscoverMoviesAsync_throws_a_friendly_exception_when_tmdb_is_unavailable()
    {
        var service = CreateService(new StubHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)));

        var action = () => service.DiscoverMoviesAsync(new MovieDiscoveryQuery { Type = "movie" });

        await action.Should().ThrowAsync<TmdbRequestException>().Where(exception => exception.StatusCode == HttpStatusCode.ServiceUnavailable);
    }

    [Fact]
    public async Task SearchMoviesAsync_returns_titles_from_an_actor_credits()
    {
        var handler = new StubHttpMessageHandler(request => request.RequestUri!.AbsolutePath.Contains("combined_credits")
            ? JsonResponse("{\"cast\":[{\"id\":4,\"title\":\"Duna\",\"media_type\":\"movie\"}]}")
            : JsonResponse("{\"page\":1,\"results\":[{\"id\":7,\"name\":\"Zendaya\",\"media_type\":\"person\"}],\"total_results\":1}"));
        var service = CreateService(handler);

        var response = await service.SearchMoviesAsync("Zendaya", 1, "all");

        response.Results.Should().ContainSingle(result => result.Title == "Duna" && result.MediaType == "movie");
    }

    [Fact]
    public async Task SearchMoviesAsync_filters_actor_credits_by_minimum_rating()
    {
        var handler = new StubHttpMessageHandler(request => request.RequestUri!.AbsolutePath.Contains("combined_credits")
            ? JsonResponse("{\"cast\":[{\"id\":4,\"title\":\"Duna\",\"media_type\":\"movie\",\"vote_average\":8.1},{\"id\":5,\"title\":\"Outro\",\"media_type\":\"movie\",\"vote_average\":5.2}]}")
            : JsonResponse("{\"page\":1,\"results\":[{\"id\":7,\"name\":\"Zendaya\",\"media_type\":\"person\"}],\"total_results\":1}"));
        var service = CreateService(handler);

        var response = await service.SearchMoviesAsync("Zendaya", 1, "all", 7);

        response.Results.Should().ContainSingle(result => result.Title == "Duna");
    }

    [Fact]
    public async Task SearchMoviesAsync_preserves_upstream_pagination_when_the_filtered_page_is_empty()
    {
        var service = CreateService(new StubHttpMessageHandler(_ => JsonResponse("""
            { "page": 1, "total_pages": 3, "total_results": 42, "results": [{ "id": 7, "vote_average": 5.2 }] }
            """)));

        var response = await service.SearchMoviesAsync("Duna", 1, "movie", 8);

        response.Results.Should().BeEmpty();
        response.TotalResults.Should().Be(42);
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(response));
        json.RootElement.GetProperty("total_pages").GetInt32().Should().Be(3);
    }

    [Fact]
    public async Task DiscoverMoviesAsync_uses_tv_sort_and_genre_and_sets_media_type()
    {
        var handler = new StubHttpMessageHandler(_ => JsonResponse("""
            { "results": [{ "id": 7, "name": "Série" }] }
            """));
        var service = CreateService(handler);

        var response = await service.DiscoverMoviesAsync(new MovieDiscoveryQuery
        {
            Type = "tv", Genres = "10759", Year = 2024, SortBy = "primary_release_date.desc"
        });

        response.Results.Should().ContainSingle(result => result.MediaType == "tv");
        handler.LastRequest!.RequestUri!.Query.Should().Contain("sort_by=first_air_date.desc")
            .And.Contain("with_genres=10759").And.Contain("first_air_date_year=2024");
    }

    [Fact]
    public async Task SearchMoviesAsync_retains_titles_when_some_actor_credits_fail()
    {
        var handler = new StubHttpMessageHandler(request => request.RequestUri!.AbsolutePath switch
        {
            "/3/person/7/combined_credits" => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable),
            "/3/person/8/combined_credits" => JsonResponse("""
                { "cast": [{ "id": 4, "media_type": "movie" }, { "id": 4, "media_type": "tv" }] }
                """),
            _ => JsonResponse("""
                { "page": 1, "total_pages": 2, "total_results": 22, "results": [
                    { "id": 4, "title": "Duna", "media_type": "movie" },
                    { "id": 7, "media_type": "person" }, { "id": 8, "media_type": "person" }
                ] }
                """)
        });
        var service = CreateService(handler);

        var response = await service.SearchMoviesAsync("Duna", 1, "all");

        response.TotalResults.Should().Be(22);
        response.Results.Select(result => result.MediaType).Should().Equal("movie", "tv");
        response.Results[0].Title.Should().Be("Duna");
    }

    [Theory]
    [InlineData(HttpStatusCode.NotFound, false)]
    [InlineData(HttpStatusCode.Unauthorized, true)]
    public async Task SearchMoviesAsync_distinguishes_missing_credits_from_unavailable_credits(HttpStatusCode creditsStatus, bool unavailable)
    {
        var service = CreateService(new StubHttpMessageHandler(request => request.RequestUri!.AbsolutePath.Contains("combined_credits")
            ? new HttpResponseMessage(creditsStatus)
            : JsonResponse("""
                { "results": [{ "id": 7, "media_type": "person" }] }
                """)));

        var action = () => service.SearchMoviesAsync("Zendaya", 1, "all");

        if (unavailable)
        {
            await action.Should().ThrowAsync<TmdbRequestException>().Where(exception =>
                exception.StatusCode == HttpStatusCode.ServiceUnavailable && exception.UpstreamStatusCode == creditsStatus);
        }
        else
        {
            var response = await action();
            response.Results.Should().BeEmpty();
        }
    }

    [Theory]
    [InlineData(HttpStatusCode.Unauthorized, HttpStatusCode.ServiceUnavailable)]
    [InlineData(HttpStatusCode.Forbidden, HttpStatusCode.ServiceUnavailable)]
    [InlineData(HttpStatusCode.TooManyRequests, HttpStatusCode.ServiceUnavailable)]
    [InlineData(HttpStatusCode.InternalServerError, HttpStatusCode.BadGateway)]
    [InlineData(HttpStatusCode.GatewayTimeout, HttpStatusCode.GatewayTimeout)]
    public async Task DiscoverMoviesAsync_maps_upstream_failures(HttpStatusCode upstream, HttpStatusCode expected)
    {
        var service = CreateService(new StubHttpMessageHandler(_ => new HttpResponseMessage(upstream)));

        var action = () => service.DiscoverMoviesAsync(new MovieDiscoveryQuery());

        await action.Should().ThrowAsync<TmdbRequestException>().Where(exception =>
            exception.StatusCode == expected && exception.UpstreamStatusCode == upstream && exception.Operation == "discover");
    }

    [Theory]
    [InlineData("invalid JSON")]
    [InlineData("null")]
    [InlineData("{}")]
    [InlineData("{\"results\":null}")]
    public async Task DiscoverMoviesAsync_reports_malformed_data_as_bad_gateway(string json)
    {
        var service = CreateService(new StubHttpMessageHandler(_ => JsonResponse(json)));

        var action = () => service.DiscoverMoviesAsync(new MovieDiscoveryQuery());

        await action.Should().ThrowAsync<TmdbRequestException>()
            .Where(exception => exception.StatusCode == HttpStatusCode.BadGateway);
    }

    [Fact]
    public async Task DiscoverMoviesAsync_reports_transport_failure_without_exposing_its_message()
    {
        var service = CreateService(new StubHttpMessageHandler(_ => throw new HttpRequestException("test-key")));

        var action = () => service.DiscoverMoviesAsync(new MovieDiscoveryQuery());

        await action.Should().ThrowAsync<TmdbRequestException>()
            .Where(exception => exception.StatusCode == HttpStatusCode.BadGateway && !exception.Message.Contains("test-key"));
    }

    [Fact]
    public async Task GetMovieDetailsAsync_keeps_not_found_and_types_recommendations()
    {
        var service = CreateService(new StubHttpMessageHandler(request => request.RequestUri!.AbsolutePath == "/3/tv/7"
            ? JsonResponse("""
                { "id": 7, "recommendations": { "results": [{ "id": 8, "name": "Outra série" }] } }
                """)
            : new HttpResponseMessage(HttpStatusCode.NotFound)));

        var response = await service.GetMovieDetailsAsync("7", "tv");
        response.Recommendations.Results.Should().ContainSingle(result => result.MediaType == "tv");

        var missing = () => service.GetMovieDetailsAsync("8", "tv");
        await missing.Should().ThrowAsync<TmdbRequestException>().Where(exception => exception.StatusCode == HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DiscoverMoviesAsync_reports_timeout_when_the_caller_has_not_cancelled()
    {
        var service = CreateService(new StubHttpMessageHandler(_ => throw new TaskCanceledException()));

        var action = () => service.DiscoverMoviesAsync(new MovieDiscoveryQuery());

        await action.Should().ThrowAsync<TmdbRequestException>().Where(exception => exception.StatusCode == HttpStatusCode.GatewayTimeout);
    }

    [Fact]
    public async Task DiscoverMoviesAsync_cancels_the_upstream_request_when_the_caller_cancels()
    {
        var requestStarted = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var service = CreateService(new StubHttpMessageHandler(async (_, cancellationToken) =>
        {
            requestStarted.SetResult();
            await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken);
            return JsonResponse("{}");
        }));
        using var cancellation = new CancellationTokenSource();

        var pending = service.DiscoverMoviesAsync(new MovieDiscoveryQuery(), cancellation.Token);
        await requestStarted.Task.WaitAsync(TimeSpan.FromSeconds(3));
        cancellation.Cancel();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => pending.WaitAsync(TimeSpan.FromSeconds(3)));
    }

    private static MovieService CreateService(HttpMessageHandler handler)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["TmdbSettings:BaseUrl"] = "https://tmdb.test/3/",
            ["TmdbSettings:ApiKey"] = "test-key"
        }).Build();
        return new MovieService(new HttpClient(handler), config);
    }

    private static HttpResponseMessage JsonResponse(string json) => new(HttpStatusCode.OK)
    {
        Content = new StringContent(json, Encoding.UTF8, "application/json")
    };

    private sealed class StubHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> _responseFactory;
        public HttpRequestMessage? LastRequest { get; private set; }
        public StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responseFactory)
            : this((request, _) => Task.FromResult(responseFactory(request))) { }

        public StubHttpMessageHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> responseFactory) =>
            _responseFactory = responseFactory;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            return _responseFactory(request, cancellationToken);
        }
    }
}
