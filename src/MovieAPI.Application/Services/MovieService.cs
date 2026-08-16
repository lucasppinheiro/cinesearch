using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using MovieAPI.Application.Interfaces;
using MovieAPI.Application.DTOs.Movie;
using Microsoft.Extensions.Configuration;
using System.Net;

namespace MovieAPI.Application.Services
{
    public class MovieService : IMovieService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public MovieService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            var baseUrl = configuration["TmdbSettings:BaseUrl"];
            _apiKey = configuration["TmdbSettings:ApiKey"] ?? string.Empty;

            if (!string.IsNullOrEmpty(baseUrl))
            {
                _httpClient.BaseAddress = new Uri(baseUrl);
            }

            _httpClient.Timeout = TimeSpan.FromSeconds(12);
        }

        public async Task<TmdbSearchResponse> SearchMoviesAsync(string query, int page, string type, decimal? minRating = null)
        {
            var url = $"search/{(type == "all" ? "multi" : type)}?api_key={_apiKey}&query={Uri.EscapeDataString(query)}&language=pt-BR&page={page}";
            var response = await GetFromTmdbAsync<TmdbSearchResponse>(url);

            if (type != "all") return FilterByRating(response, minRating);

            var personIds = response.Results
                .Where(result => result.MediaType == "person")
                .Select(result => result.Id)
                .Take(3)
                .ToList();

            if (personIds.Count == 0) return FilterByRating(response, minRating);

            var personCredits = await Task.WhenAll(personIds.Select(id =>
                GetFromTmdbAsync<TmdbPersonCredits>($"person/{id}/combined_credits?api_key={_apiKey}&language=pt-BR")));

            var titles = response.Results.Where(result => result.MediaType != "person")
                .Concat(personCredits.SelectMany(credits => credits.Cast))
                .Where(result => result.MediaType is "movie" or "tv")
                .GroupBy(result => new { result.Id, result.MediaType })
                .Select(group => group.First())
                .ToList();

            response.Results = titles;
            response.TotalResults = titles.Count;
            return FilterByRating(response, minRating);
        }

        private static TmdbSearchResponse FilterByRating(TmdbSearchResponse response, decimal? minRating)
        {
            if (!minRating.HasValue) return response;
            response.Results = response.Results.Where(result => result.VoteAverage >= (double)minRating.Value).ToList();
            response.TotalResults = response.Results.Count;
            return response;
        }

        public async Task<TmdbSearchResponse> DiscoverMoviesAsync(MovieDiscoveryQuery query)
        {
            var url = $"discover/{query.Type}?api_key={_apiKey}&language=pt-BR&page={query.Page}&sort_by={Uri.EscapeDataString(query.SortBy)}";
            if (!string.IsNullOrWhiteSpace(query.Genres)) url += $"&with_genres={Uri.EscapeDataString(query.Genres)}";
            if (query.Year.HasValue) url += query.Type == "movie" ? $"&primary_release_year={query.Year}" : $"&first_air_date_year={query.Year}";
            if (query.MinRating.HasValue) url += $"&vote_average.gte={query.MinRating.Value.ToString(System.Globalization.CultureInfo.InvariantCulture)}&vote_count.gte=50";
            return await GetFromTmdbAsync<TmdbSearchResponse>(url);
        }

        public async Task<TmdbMovieDetails> GetMovieDetailsAsync(string id, string type)
        {
            var url = $"{type}/{id}?api_key={_apiKey}&language=pt-BR&append_to_response=credits,videos,recommendations";
            return await GetFromTmdbAsync<TmdbMovieDetails>(url);
        }

        private async Task<T> GetFromTmdbAsync<T>(string url) where T : new()
        {
            if (string.IsNullOrWhiteSpace(_apiKey)) throw new TmdbRequestException(HttpStatusCode.ServiceUnavailable, "A integração com o catálogo ainda não foi configurada.");
            try
            {
                var response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                    throw new TmdbRequestException(response.StatusCode, "O catálogo de filmes não está disponível no momento.");
                return await response.Content.ReadFromJsonAsync<T>() ?? new T();
            }
            catch (TaskCanceledException)
            {
                throw new TmdbRequestException(HttpStatusCode.GatewayTimeout, "O catálogo demorou para responder. Tente novamente.");
            }
        }
    }

    public sealed class TmdbRequestException : Exception
    {
        public HttpStatusCode StatusCode { get; }
        public TmdbRequestException(HttpStatusCode statusCode, string message) : base(message) => StatusCode = statusCode;
    }
}
