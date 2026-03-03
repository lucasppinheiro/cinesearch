namespace MovieAPI.Domain.Entities
{
    public class Movie
    {
        public string Title { get; set; } = string.Empty;
        public string Year { get; set; } = string.Empty;
        public string imdbID { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Poster { get; set; } = string.Empty;
    }

    public class MovieSearchResponse
    {
        public List<Movie> Search { get; set; } = new();
        public string totalResults { get; set; } = string.Empty;
        public string Response { get; set; } = string.Empty;
    }
}
