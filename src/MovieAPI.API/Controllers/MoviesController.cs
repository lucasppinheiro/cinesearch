using MovieAPI.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using MovieAPI.Application.DTOs.Movie;

namespace MovieAPI.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MoviesController : ControllerBase
    {
        private readonly IMovieService _movieService;

        public MoviesController(IMovieService movieService)
        {
            _movieService = movieService;
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string query, [FromQuery] int page = 1, [FromQuery] string type = "all", [FromQuery] decimal? minRating = null)
        {
            if (string.IsNullOrWhiteSpace(query) || query.Trim().Length > 100)
                return BadRequest(new { message = "A busca deve ter entre 1 e 100 caracteres." });
            if (!IsPageValid(page) || !IsSearchTypeValid(type) || minRating is < 0 or > 10)
                return BadRequest(new { message = "Parâmetros de busca inválidos." });

            var result = await _movieService.SearchMoviesAsync(query.Trim(), page, type, minRating);
            return Ok(result);
        }

        [HttpGet("discover")]
        public async Task<IActionResult> Discover([FromQuery] MovieDiscoveryQuery query)
        {
            if (!IsTypeValid(query.Type) || !IsPageValid(query.Page) || query.Year is < 1888 or > 2100 || query.MinRating is < 0 or > 10 ||
                !new[] { "popularity.desc", "popularity.asc", "vote_average.desc", "primary_release_date.desc" }.Contains(query.SortBy))
                return BadRequest(new { message = "Filtros de descoberta inválidos." });

            var result = await _movieService.DiscoverMoviesAsync(query);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetDetails(string id, [FromQuery] string type = "movie")
        {
            if (!int.TryParse(id, out var parsedId) || parsedId <= 0 || !IsTypeValid(type))
                return BadRequest(new { message = "Identificador ou tipo inválido." });

            var result = await _movieService.GetMovieDetailsAsync(parsedId.ToString(), type);
            return Ok(result);
        }

        private static bool IsTypeValid(string type) => type is "movie" or "tv";
        private static bool IsSearchTypeValid(string type) => type is "all" or "movie" or "tv";
        private static bool IsPageValid(int page) => page is >= 1 and <= 500;
    }
}
