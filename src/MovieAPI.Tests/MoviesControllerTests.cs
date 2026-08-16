using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using MovieAPI.API.Controllers;
using MovieAPI.Application.DTOs.Movie;
using MovieAPI.Application.Interfaces;
using Xunit;

namespace MovieAPI.Tests;

public class MoviesControllerTests
{
    [Fact]
    public async Task Search_rejects_an_invalid_page()
    {
        var controller = new MoviesController(new Mock<IMovieService>().Object);

        var result = await controller.Search("Duna", 0, "movie");

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Discover_forwards_valid_filters_to_service()
    {
        var service = new Mock<IMovieService>();
        service.Setup(s => s.DiscoverMoviesAsync(It.IsAny<MovieDiscoveryQuery>())).ReturnsAsync(new TmdbSearchResponse());
        var controller = new MoviesController(service.Object);
        var query = new MovieDiscoveryQuery { Type = "tv", Year = 2024, MinRating = 7, Page = 1, SortBy = "vote_average.desc" };

        var result = await controller.Discover(query);

        result.Should().BeOfType<OkObjectResult>();
        service.Verify(s => s.DiscoverMoviesAsync(query), Times.Once);
    }
}
