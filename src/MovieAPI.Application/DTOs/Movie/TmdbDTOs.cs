using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace MovieAPI.Application.DTOs.Movie
{
    public class TmdbSearchResponse
    {
        [JsonPropertyName("page")]
        public int Page { get; set; }

        [JsonPropertyName("results")]
        public List<TmdbMovieResult> Results { get; set; } = new();

        [JsonPropertyName("total_results")]
        public int TotalResults { get; set; }
    }

    public class TmdbMovieResult
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("title")]
        public string? Title { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("release_date")]
        public string? ReleaseDate { get; set; }

        [JsonPropertyName("first_air_date")]
        public string? FirstAirDate { get; set; }

        [JsonPropertyName("poster_path")]
        public string? PosterPath { get; set; }

        [JsonPropertyName("media_type")]
        public string? MediaType { get; set; }

        [JsonPropertyName("vote_average")]
        public double? VoteAverage { get; set; }
    }

    public class TmdbPersonCredits
    {
        [JsonPropertyName("cast")]
        public List<TmdbMovieResult> Cast { get; set; } = new();
    }

    public class TmdbMovieDetails
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("title")]
        public string? Title { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("overview")]
        public string Overview { get; set; } = string.Empty;

        [JsonPropertyName("release_date")]
        public string? ReleaseDate { get; set; }

        [JsonPropertyName("first_air_date")]
        public string? FirstAirDate { get; set; }

        [JsonPropertyName("runtime")]
        public int? Runtime { get; set; }

        [JsonPropertyName("poster_path")]
        public string? PosterPath { get; set; }

        [JsonPropertyName("vote_average")]
        public double VoteAverage { get; set; }

        [JsonPropertyName("genres")]
        public List<TmdbGenre> Genres { get; set; } = new();

        [JsonPropertyName("credits")]
        public TmdbCredits Credits { get; set; } = new();

        [JsonPropertyName("created_by")]
        public List<TmdbCreatedBy>? CreatedBy { get; set; }

        [JsonPropertyName("number_of_seasons")]
        public int? NumberOfSeasons { get; set; }

        [JsonPropertyName("budget")]
        public long Budget { get; set; }

        [JsonPropertyName("revenue")]
        public long Revenue { get; set; }

        [JsonPropertyName("videos")]
        public TmdbVideos Videos { get; set; } = new();

        [JsonPropertyName("recommendations")]
        public TmdbSearchResponse Recommendations { get; set; } = new();
    }

    public class TmdbCreatedBy
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
    }

    public class TmdbGenre
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
    }

    public class TmdbCredits
    {
        [JsonPropertyName("cast")]
        public List<TmdbCastMember> Cast { get; set; } = new();

        [JsonPropertyName("crew")]
        public List<TmdbCrewMember> Crew { get; set; } = new();
    }

    public class TmdbCastMember
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("character")]
        public string? Character { get; set; }

        [JsonPropertyName("profile_path")]
        public string? ProfilePath { get; set; }
    }

    public class TmdbCrewMember
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("job")]
        public string Job { get; set; } = string.Empty;
    }

    public class TmdbVideos
    {
        [JsonPropertyName("results")]
        public List<TmdbVideo> Results { get; set; } = new();
    }

    public class TmdbVideo
    {
        [JsonPropertyName("key")]
        public string Key { get; set; } = string.Empty;

        [JsonPropertyName("site")]
        public string Site { get; set; } = string.Empty;

        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("official")]
        public bool Official { get; set; }
    }

    public class MovieDiscoveryQuery
    {
        public string Type { get; init; } = "movie";
        public string? Genres { get; init; }
        public int? Year { get; init; }
        public decimal? MinRating { get; init; }
        public string SortBy { get; init; } = "popularity.desc";
        public int Page { get; init; } = 1;
    }
}
