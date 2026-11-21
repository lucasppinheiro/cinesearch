import type { DiscoveryFilters, MediaType, TmdbSearchResponse, TmdbMovieDetails } from '../types/movie';

const apiOrigin = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '') ?? '';
const API_MOVIES = `${apiOrigin}/api/movies`;

export class ApiError extends Error {
    readonly status?: number;

    constructor(message: string, status?: number) {
        super(message);
        this.status = status;
    }
}

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
    let response: Response;
    let body: unknown;
    try {
        response = await fetch(url, { signal });
        body = await response.json().catch(() => null);
        signal?.throwIfAborted();
    } catch (reason) {
        if (signal?.reason?.name === 'TimeoutError') throw new ApiError('O catálogo demorou para responder. Tente novamente.', 504);
        if (signal?.aborted) throw reason;
        throw new ApiError('Não foi possível conectar ao catálogo. Tente novamente.');
    }

    if (!response.ok) {
        const fallback = response.status === 429
            ? 'Muitas solicitações ao catálogo. Aguarde um momento e tente novamente.'
            : 'O catálogo está indisponível no momento. Tente novamente.';
        const apiMessage = body && typeof body === 'object' && 'message' in body ? body.message : undefined;
        const message = typeof apiMessage === 'string' && apiMessage.trim() ? apiMessage : fallback;
        throw new ApiError(message, response.status);
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new ApiError('O catálogo retornou uma resposta inválida. Tente novamente.');
    }
    return body as T;
}

export const searchMovies = (query: string, page = 1, type: MediaType = 'all', minRating?: number, signal?: AbortSignal): Promise<TmdbSearchResponse> => {
    const params = new URLSearchParams({ query, page: String(page), type });
    if (minRating !== undefined) params.set('minRating', String(minRating));
    return request<TmdbSearchResponse>(`${API_MOVIES}/search?${params}`, signal);
};

export const discoverMovies = (filters: DiscoveryFilters, signal?: AbortSignal): Promise<TmdbSearchResponse> => {
    const params = new URLSearchParams({ type: filters.type, page: String(filters.page ?? 1), sortBy: filters.sortBy ?? 'popularity.desc' });
    if (filters.genres) params.set('genres', filters.genres);
    if (filters.year) params.set('year', String(filters.year));
    if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating));
    return request<TmdbSearchResponse>(`${API_MOVIES}/discover?${params}`, signal);
};

export const getMovieDetails = (id: string, type = 'movie', signal?: AbortSignal): Promise<TmdbMovieDetails> => {
    const params = new URLSearchParams({ type });
    return request<TmdbMovieDetails>(`${API_MOVIES}/${encodeURIComponent(id)}?${params}`, signal);
};
