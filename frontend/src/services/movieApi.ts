import type { DiscoveryFilters, MediaType, TmdbSearchResponse, TmdbMovieDetails } from '../types/movie';

const getApiMoviesUrl = (): string => {
  const url = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:5171';
  return `${url}/api/movies`;
};

const API_MOVIES = getApiMoviesUrl();

const request = async <T>(url: string): Promise<T> => {
    const response = await fetch(url);
    if (!response.ok) {
        const text = await response.text();
        let message = `API retornou ${response.status}`;
        try { message = JSON.parse(text).message ?? message; } catch { /* resposta sem JSON */ }
        throw new Error(message);
    }
    return response.json() as Promise<T>;
};

export const searchMovies = (query: string, page = 1, type: MediaType = 'all', minRating?: number): Promise<TmdbSearchResponse> => {
    const params = new URLSearchParams({ query, page: String(page), type });
    if (minRating) params.set('minRating', String(minRating));
    return request<TmdbSearchResponse>(`${API_MOVIES}/search?${params}`);
};

export const discoverMovies = (filters: DiscoveryFilters): Promise<TmdbSearchResponse> => {
    const params = new URLSearchParams({ type: filters.type, page: String(filters.page ?? 1), sortBy: filters.sortBy ?? 'popularity.desc' });
    if (filters.genres) params.set('genres', filters.genres);
    if (filters.year) params.set('year', String(filters.year));
    if (filters.minRating) params.set('minRating', String(filters.minRating));
    return request<TmdbSearchResponse>(`${API_MOVIES}/discover?${params}`);
};

export const getMovieDetails = async (id: string, type: string = 'movie'): Promise<TmdbMovieDetails> => {
    const url = `${API_MOVIES}/${id}?type=${type}`;
    return request<TmdbMovieDetails>(url);
};
