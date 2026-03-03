import { TmdbSearchResponse, TmdbMovieDetails } from '../types/movie';

const getApiMoviesUrl = (): string => {
  const url = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:5171';
  return `${url}/api/movies`;
};

const API_MOVIES = getApiMoviesUrl();

export const searchMovies = async (query: string): Promise<TmdbSearchResponse> => {
    const url = `${API_MOVIES}/search?query=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) {
        const text = await response.text();
        console.error('[movieApi] searchMovies falhou:', response.status, url, text);
        throw new Error(`API retornou ${response.status}: ${text.slice(0, 100)}`);
    }
    return response.json();
};

export const getMovieDetails = async (id: string, type: string = 'movie'): Promise<TmdbMovieDetails> => {
    const url = `${API_MOVIES}/${id}?type=${type}`;
    const response = await fetch(url);
    if (!response.ok) {
        console.error('[movieApi] getMovieDetails falhou:', response.status, url);
        throw new Error('Failed to fetch movie details');
    }
    return response.json();
};
