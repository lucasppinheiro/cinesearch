using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using MovieAPI.Application.Interfaces;
using MovieAPI.Application.DTOs.Movie;
using Microsoft.Extensions.Configuration;

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

            if (string.IsNullOrEmpty(_apiKey))
            {
                throw new InvalidOperationException("A Chave da API do TMDB (TmdbSettings:ApiKey) não está configurada no appsettings.json!");
            }
        }

        public async Task<object> SearchMoviesAsync(string query)
        {
            var url = $"search/multi?api_key={_apiKey}&query={Uri.EscapeDataString(query)}&language=pt-BR&page=1";
            var response = await _httpClient.GetAsync(url);
            
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<TmdbSearchResponse>();
            return result ?? new TmdbSearchResponse();
        }

        public async Task<object> GetMovieDetailsAsync(string id, string type)
        {
            var url = $"{type}/{id}?api_key={_apiKey}&language=pt-BR&append_to_response=credits";
            var response = await _httpClient.GetAsync(url);
            
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<TmdbMovieDetails>();
            return result ?? new object();
        }
    }
}
