import { afterEach, expect, it, vi } from 'vitest';
import { discoverMovies } from './movieApi';

vi.hoisted(() => {
    vi.stubEnv('VITE_API_URL', 'https://cinesearch-api-61a5.onrender.com');
});

afterEach(() => vi.unstubAllGlobals());

it('uses the same-origin route once when the direct connection fails', async () => {
    const fetchMock = vi.fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(Response.json({ results: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(discoverMovies({ type: 'movie' })).resolves.toEqual({ results: [] });
    const path = '/api/movies/discover?type=movie&page=1&sortBy=popularity.desc';
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
        'https://cinesearch-api-61a5.onrender.com' + path,
        path,
    ]);
});

it('does not fall back for API errors or canceled requests', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn()
        .mockResolvedValueOnce(Response.json({}, { status: 429 }))
        .mockImplementationOnce(() => {
            controller.abort();
            return Promise.reject(controller.signal.reason);
        });
    vi.stubGlobal('fetch', fetchMock);

    await expect(discoverMovies({ type: 'movie' })).rejects.toMatchObject({ status: 429 });
    await expect(discoverMovies({ type: 'movie' }, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
});
