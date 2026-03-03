# CineSearch

Aplicação acadêmica para busca e visualização de filmes e séries usando TMDB.

## Stack

- Backend: .NET 8, ASP.NET Core Web API, HttpClient, Swagger, Serilog
- Frontend: React 19, TypeScript, Vite, React Router

## Funcionalidades

- Busca de filmes e séries (`search/multi` via TMDB)
- Página de detalhes por tipo (`movie` ou `tv`)
- Endpoint de health check
- CORS configurável por ambiente

## Requisitos

- .NET SDK 8
- Node.js 20+
- npm

## Configuração

### Backend

Use `src/MovieAPI.API/appsettings.Development.json` com os valores de ambiente local.

Campos principais:

- `TmdbSettings:ApiKey`
- `TmdbSettings:BaseUrl`
- `Cors:AllowedOrigins`

### Frontend

Copie `frontend/.env.example` para `frontend/.env`:

```bash
VITE_API_URL=http://localhost:5171
```

## Execução local

### Backend

```bash
cd src/MovieAPI.API
dotnet restore
dotnet run --launch-profile http
```

API em `http://localhost:5171`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend em `http://localhost:5173` (ou próxima porta livre).

## Endpoints

- `GET /api/movies/search?query={termo}`
- `GET /api/movies/{id}?type=movie|tv`
- `GET /health`

## Docker

Crie um arquivo `.env` na raiz a partir de `.env.docker` e preencha:

- `TMDB_API_KEY`
- `JWT_SECRET_KEY`

```bash
docker-compose up -d
```

## Estrutura

```text
src/
  MovieAPI.API/
  MovieAPI.Application/
  MovieAPI.Domain/
  MovieAPI.Infrastructure/
frontend/
```
