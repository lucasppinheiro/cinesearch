using System.Threading.Tasks;

namespace MovieAPI.Application.Interfaces
{
    public interface IMovieService
    {
        Task<object> SearchMoviesAsync(string query);
        Task<object> GetMovieDetailsAsync(string id, string type);
    }
}
