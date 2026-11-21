import { afterEach, expect, it, vi } from 'vitest';
import { discoverMovies, getMovieDetails, searchMovies } from './movieApi';

afterEach(() => vi.unstubAllGlobals());

it('uses the relative API URL, forwards cancellation, and allows retry after failure', async () => {
    const fetchMock = vi.fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(Response.json({ results: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    await expect(discoverMovies({ type: 'movie' }, controller.signal)).rejects.toThrow('Não foi possível conectar ao catálogo. Tente novamente.');
    expect(fetchMock).toHaveBeenCalledWith('/api/movies/discover?type=movie&page=1&sortBy=popularity.desc', { signal: controller.signal });

    await expect(discoverMovies({ type: 'movie' })).resolves.toEqual({ results: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('preserves the API public message and status for independent URLs', async () => {
    const fetchMock = vi.fn()
        .mockResolvedValueOnce(Response.json({ message: 'Título não encontrado.' }, { status: 404 }))
        .mockResolvedValueOnce(Response.json({ results: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getMovieDetails('1396', 'tv')).rejects.toMatchObject({ status: 404, message: 'Título não encontrado.' });
    await expect(searchMovies('Breaking Bad', 2, 'tv', 7)).resolves.toEqual({ results: [] });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
        '/api/movies/1396?type=tv',
        '/api/movies/search?query=Breaking+Bad&page=2&type=tv&minRating=7',
    ]);
});
