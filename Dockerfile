FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["src/MovieAPI.API/MovieAPI.API.csproj", "MovieAPI.API/"]
COPY ["src/MovieAPI.Application/MovieAPI.Application.csproj", "MovieAPI.Application/"]
COPY ["src/MovieAPI.Domain/MovieAPI.Domain.csproj", "MovieAPI.Domain/"]
COPY ["src/MovieAPI.Infrastructure/MovieAPI.Infrastructure.csproj", "MovieAPI.Infrastructure/"]
RUN dotnet restore "MovieAPI.API/MovieAPI.API.csproj"
COPY src/ .
WORKDIR "/src/MovieAPI.API"
RUN dotnet publish "MovieAPI.API.csproj" --no-restore -c Release -o /app/publish

FROM base AS final
WORKDIR /app
ENV DOTNET_HOSTBUILDER__RELOADCONFIGONCHANGE=false
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "MovieAPI.API.dll"]
