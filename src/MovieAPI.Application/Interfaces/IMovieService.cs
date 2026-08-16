using System.Threading.Tasks;
using MovieAPI.Application.DTOs.Movie;

namespace MovieAPI.Application.Interfaces
{
    public interface IMovieService
    {
        Task<TmdbSearchResponse> SearchMoviesAsync(string query, int page, string type, decimal? minRating = null);
        Task<TmdbSearchResponse> DiscoverMoviesAsync(MovieDiscoveryQuery query);
        Task<TmdbMovieDetails> GetMovieDetailsAsync(string id, string type);
    }
}
