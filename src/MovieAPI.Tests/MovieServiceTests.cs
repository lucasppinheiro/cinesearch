using System.Net;
using System.Text;
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
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responseFactory;
        public HttpRequestMessage? LastRequest { get; private set; }
        public StubHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responseFactory) => _responseFactory = responseFactory;
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            return Task.FromResult(_responseFactory(request));
        }
    }
}
