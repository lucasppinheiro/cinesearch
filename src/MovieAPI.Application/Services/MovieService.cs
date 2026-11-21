using System;
using System.Globalization;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MovieAPI.Application.Interfaces;
using MovieAPI.Application.DTOs.Movie;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MovieAPI.Application.Services
{
    public class MovieService : IMovieService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly ILogger<MovieService>? _logger;

        public MovieService(HttpClient httpClient, IConfiguration configuration, ILogger<MovieService>? logger = null)
        {
            _httpClient = httpClient;
            _logger = logger;
            _apiKey = Uri.EscapeDataString(configuration["TmdbSettings:ApiKey"]?.Trim() ?? string.Empty);

            var baseUrl = configuration["TmdbSettings:BaseUrl"] ?? httpClient.BaseAddress?.AbsoluteUri ?? "https://api.themoviedb.org/3/";
            _httpClient.BaseAddress = Uri.TryCreate(baseUrl.Trim().TrimEnd('/') + '/', UriKind.Absolute, out var endpoint) &&
                endpoint.Scheme == Uri.UriSchemeHttps && endpoint.Query.Length == 0 && endpoint.Fragment.Length == 0 && endpoint.UserInfo.Length == 0
                ? endpoint
                : null;
            _httpClient.Timeout = TimeSpan.FromSeconds(12);
        }

        public async Task<TmdbSearchResponse> SearchMoviesAsync(string query, int page, string type, decimal? minRating = null, CancellationToken cancellationToken = default)
        {
            var url = $"search/{(type == "all" ? "multi" : type)}?api_key={_apiKey}&query={Uri.EscapeDataString(query)}&language=pt-BR&page={page}";
            var response = await GetFromTmdbAsync<TmdbSearchResponse>(url, "search", cancellationToken);

            if (type != "all")
            {
                SetMediaType(response.Results, type);
                return FilterByRating(response, minRating);
            }

            var personIds = response.Results
                .Where(result => result.MediaType == "person")
                .Select(result => result.Id)
                .Distinct()
                .Take(3)
                .ToList();

            if (personIds.Count == 0) return FilterByRating(response, minRating);

            var directTitles = response.Results.Where(result => result.MediaType is "movie" or "tv").ToList();
            var personCredits = await Task.WhenAll(personIds.Select(id => GetPersonCreditsAsync(id, cancellationToken)));
            if (directTitles.Count == 0 && personCredits.All(result => result.Error is not null))
                throw personCredits[0].Error!;

            response.Results = directTitles
                .Concat(personCredits.SelectMany(result => result.Credits?.Cast ?? []))
                .Where(result => result.MediaType is "movie" or "tv")
                .DistinctBy(result => (result.Id, result.MediaType))
                .ToList();

            return FilterByRating(response, minRating);
        }

        private static TmdbSearchResponse FilterByRating(TmdbSearchResponse response, decimal? minRating)
        {
            if (minRating.HasValue)
                response.Results = response.Results.Where(result => result.VoteAverage >= (double)minRating.Value).ToList();
            return response;
        }

        public async Task<TmdbSearchResponse> DiscoverMoviesAsync(MovieDiscoveryQuery query, CancellationToken cancellationToken = default)
        {
            var sortBy = query.Type == "tv" && query.SortBy == "primary_release_date.desc" ? "first_air_date.desc" : query.SortBy;
            var url = $"discover/{query.Type}?api_key={_apiKey}&language=pt-BR&page={query.Page}&sort_by={Uri.EscapeDataString(sortBy)}";
            if (!string.IsNullOrWhiteSpace(query.Genres)) url += $"&with_genres={Uri.EscapeDataString(query.Genres)}";
            if (query.Year.HasValue) url += query.Type == "movie" ? $"&primary_release_year={query.Year}" : $"&first_air_date_year={query.Year}";
            if (query.MinRating.HasValue) url += $"&vote_average.gte={query.MinRating.Value.ToString(CultureInfo.InvariantCulture)}&vote_count.gte=50";

            var response = await GetFromTmdbAsync<TmdbSearchResponse>(url, "discover", cancellationToken);
            SetMediaType(response.Results, query.Type);
            return response;
        }

        public async Task<TmdbMovieDetails> GetMovieDetailsAsync(string id, string type, CancellationToken cancellationToken = default)
        {
            var url = $"{type}/{id}?api_key={_apiKey}&language=pt-BR&append_to_response=credits,videos,recommendations";
            var response = await GetFromTmdbAsync<TmdbMovieDetails>(url, "details", cancellationToken);
            if (response.Recommendations?.Results is { } recommendations)
                SetMediaType(recommendations, type);
            return response;
        }

        private static void SetMediaType(List<TmdbMovieResult> results, string type)
        {
            foreach (var item in results)
                item.MediaType ??= type;
        }

        private async Task<(TmdbPersonCredits? Credits, TmdbRequestException? Error)> GetPersonCreditsAsync(int id, CancellationToken cancellationToken)
        {
            var url = $"person/{id}/combined_credits?api_key={_apiKey}&language=pt-BR";
            try
            {
                return (await GetFromTmdbAsync<TmdbPersonCredits>(url, "credits", cancellationToken), null);
            }
            catch (TmdbRequestException exception) when (exception.UpstreamStatusCode == HttpStatusCode.NotFound)
            {
                return (null, null);
            }
            catch (TmdbRequestException exception)
            {
                _logger?.LogWarning("Falha ao consultar créditos do TMDB ({UpstreamStatusCode}, resposta {StatusCode})",
                    (int?)exception.UpstreamStatusCode, (int)exception.StatusCode);
                return (null, exception);
            }
        }

        private async Task<T> GetFromTmdbAsync<T>(string url, string operation, CancellationToken cancellationToken) where T : class
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (_apiKey.Length == 0 || _httpClient.BaseAddress is null)
                throw new TmdbRequestException(HttpStatusCode.ServiceUnavailable, "A integração com o catálogo ainda não foi configurada.", operation);

            try
            {
                using var response = await _httpClient.GetAsync(url, cancellationToken);
                if (!response.IsSuccessStatusCode)
                    throw CreateUpstreamException(response.StatusCode, operation);

                var payload = await response.Content.ReadFromJsonAsync<T>(cancellationToken: cancellationToken);
                if (payload is null or TmdbSearchResponse { Results: null } or TmdbPersonCredits { Cast: null } or TmdbMovieDetails { Id: <= 0 })
                    throw new JsonException();
                return payload;
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                throw new TmdbRequestException(HttpStatusCode.GatewayTimeout, "O catálogo demorou para responder. Tente novamente.", operation);
            }
            catch (Exception exception) when (exception is HttpRequestException or JsonException)
            {
                throw new TmdbRequestException(HttpStatusCode.BadGateway, "O catálogo não respondeu como esperado. Tente novamente.", operation);
            }
        }

        private static TmdbRequestException CreateUpstreamException(HttpStatusCode upstream, string operation)
        {
            return upstream switch
            {
                HttpStatusCode.NotFound when operation == "details" =>
                    new TmdbRequestException(HttpStatusCode.NotFound, "Título não encontrado no catálogo.", operation, upstream),
                HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden or HttpStatusCode.TooManyRequests or HttpStatusCode.ServiceUnavailable =>
                    new TmdbRequestException(HttpStatusCode.ServiceUnavailable, "O catálogo está temporariamente indisponível. Tente novamente.", operation, upstream),
                HttpStatusCode.RequestTimeout or HttpStatusCode.GatewayTimeout =>
                    new TmdbRequestException(HttpStatusCode.GatewayTimeout, "O catálogo demorou para responder. Tente novamente.", operation, upstream),
                _ => new TmdbRequestException(HttpStatusCode.BadGateway, "O catálogo não respondeu como esperado. Tente novamente.", operation, upstream)
            };
        }
    }

    public sealed class TmdbRequestException : Exception
    {
        public HttpStatusCode StatusCode { get; }
        public string Operation { get; }
        public HttpStatusCode? UpstreamStatusCode { get; }

        public TmdbRequestException(HttpStatusCode statusCode, string message, string operation = "catalog", HttpStatusCode? upstreamStatusCode = null) : base(message)
        {
            StatusCode = statusCode;
            Operation = operation;
            UpstreamStatusCode = upstreamStatusCode;
        }
    }
}
