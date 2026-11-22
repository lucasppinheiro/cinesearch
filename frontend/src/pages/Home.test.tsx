import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './Home';
import { discoverMovies, searchMovies } from '../services/movieApi';

vi.mock('../services/movieApi', () => ({ discoverMovies: vi.fn(), searchMovies: vi.fn() }));

const discoverMoviesMock = vi.mocked(discoverMovies);
const searchMoviesMock = vi.mocked(searchMovies);
const payload = { page: 1, total_pages: 3, total_results: 3, results: [{ id: 1, title: 'Duna', poster_path: null, media_type: 'movie', vote_average: 8 }] };

describe('Home', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
        discoverMoviesMock.mockResolvedValue(payload);
    });

    it('loads discovery results and sends selected filters', async () => {
        render(<MemoryRouter><Home /></MemoryRouter>);
        expect(await screen.findByText('Duna')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Ano'), { target: { value: '2024' } });
        fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

        await waitFor(() => expect(discoverMoviesMock).toHaveBeenLastCalledWith(expect.objectContaining({ year: 2024, page: 1 }), expect.any(AbortSignal)));
    });

    it('moves to the requested page', async () => {
        render(<MemoryRouter><Home /></MemoryRouter>);
        await screen.findByText('Duna');
        fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));

        await waitFor(() => expect(discoverMoviesMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }), expect.any(AbortSignal)));
        expect(screen.getByRole('heading', { name: 'Em alta agora' })).toHaveFocus();
    });

    it('starts an actor search in Tudo after exploring series with filters', async () => {
        searchMoviesMock.mockResolvedValue(payload);
        render(<MemoryRouter initialEntries={['/?type=tv&minRating=9']}><Home /></MemoryRouter>);

        fireEvent.change(screen.getByRole('searchbox', { name: /busca/i }), { target: { value: 'Fernanda Montenegro' } });
        fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

        await waitFor(() => expect(searchMoviesMock).toHaveBeenLastCalledWith('Fernanda Montenegro', 1, 'all', undefined, expect.any(AbortSignal)));
    });

    it('offers to search in Tudo when a typed search has no results', async () => {
        searchMoviesMock.mockResolvedValueOnce({ ...payload, results: [] }).mockResolvedValue(payload);
        render(<MemoryRouter initialEntries={['/?query=Duna&type=tv&page=2']}><Home /></MemoryRouter>);

        fireEvent.click(await screen.findByRole('button', { name: 'Buscar em Tudo' }));

        await waitFor(() => expect(searchMoviesMock).toHaveBeenLastCalledWith('Duna', 1, 'all', undefined, expect.any(AbortSignal)));
    });

    it('removes individual filters and clears the rest while keeping the media type', async () => {
        render(<MemoryRouter initialEntries={['/?type=tv&genres=18&year=2024&page=2']}><Home /></MemoryRouter>);
        fireEvent.click(screen.getByRole('button', { name: 'Remover filtro Drama' }));
        await waitFor(() => expect(discoverMoviesMock).toHaveBeenLastCalledWith(
            expect.objectContaining({ type: 'tv', year: 2024, genres: undefined, page: 1 }), expect.any(AbortSignal)));
        fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
        await waitFor(() => expect(discoverMoviesMock).toHaveBeenLastCalledWith(
            expect.objectContaining({ type: 'tv', year: undefined, page: 1 }), expect.any(AbortSignal)));
    });

    it.each(['Voltar pelo link', 'Voltar pelo histórico'])('restores the original card when using %s', async (action) => {
        const bookmarkRef = { current: null };
        function DetailStub() {
            const navigate = useNavigate();
            return <>
                <Link to="/?page=2" state={{ restoreCatalog: true }}>Voltar pelo link</Link>
                <button onClick={() => navigate(-1)}>Voltar pelo histórico</button>
            </>;
        }

        render(<MemoryRouter initialEntries={['/?page=2']}><Routes>
            <Route path="/" element={<Home bookmarkRef={bookmarkRef} />} />
            <Route path="/movie/:id" element={<DetailStub />} />
        </Routes></MemoryRouter>);

        fireEvent.click((await screen.findByRole('heading', { name: 'Duna', level: 3 })).closest('a')!);
        fireEvent.click(screen.getByText(action));

        expect((await screen.findByRole('heading', { name: 'Duna', level: 3 })).closest('a')).toHaveFocus();
        expect(discoverMoviesMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }), expect.any(AbortSignal));
    });

    it('retries the same discovery after an error', async () => {
        discoverMoviesMock.mockRejectedValueOnce(new Error('Catálogo indisponível'));
        render(<MemoryRouter initialEntries={['/?type=tv&page=2']}><Home /></MemoryRouter>);

        expect(await screen.findByText('Catálogo indisponível')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
        expect(await screen.findByText('Duna')).toBeInTheDocument();
        expect(discoverMoviesMock).toHaveBeenCalledTimes(2);
        expect(discoverMoviesMock).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'tv', page: 2 }), expect.any(AbortSignal));
    });

    it('links typed series results and paginates the applied search while the next term is edited', async () => {
        searchMoviesMock.mockResolvedValue({ ...payload, results: [{ id: 1396, name: 'Breaking Bad', poster_path: null }] });
        render(<MemoryRouter initialEntries={['/?query=Breaking+Bad&type=tv']}><Home /></MemoryRouter>);

        expect(await screen.findByRole('link', { name: /Breaking Bad/ })).toHaveAttribute('href', '/movie/1396?type=tv');
        fireEvent.change(screen.getByRole('searchbox', { name: /busca/i }), { target: { value: 'Outro termo' } });
        expect(screen.getByRole('heading', { name: /Resultados para.*Breaking Bad/ })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
        await waitFor(() => expect(searchMoviesMock).toHaveBeenLastCalledWith('Breaking Bad', 2, 'tv', undefined, expect.any(AbortSignal)));
    });

    it('keeps pagination available on an empty page after filtering', async () => {
        searchMoviesMock.mockResolvedValue({ ...payload, results: [] });
        render(<MemoryRouter initialEntries={['/?query=Duna&minRating=9']}><Home /></MemoryRouter>);

        expect(await screen.findByText('Nenhum título encontrado nesta página.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Próxima página' })).toBeEnabled();
        fireEvent.click(screen.getByRole('button', { name: 'Editar busca' }));
        expect(screen.getByRole('searchbox')).toHaveFocus();
    });

    it('ignores an older discovery after a successful search', async () => {
        let finishDiscovery: (value: typeof payload) => void = () => {};
        discoverMoviesMock.mockImplementationOnce(() => new Promise(resolve => { finishDiscovery = resolve; }));
        searchMoviesMock.mockResolvedValue({ ...payload, results: [{ id: 2, title: 'Alien', poster_path: null, media_type: 'movie' }] });
        render(<MemoryRouter><Home /></MemoryRouter>);

        fireEvent.change(screen.getByRole('searchbox', { name: /busca/i }), { target: { value: 'Alien' } });
        fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
        expect(await screen.findByRole('link', { name: /Alien/ })).toBeInTheDocument();
        expect(discoverMoviesMock.mock.calls[0][1]?.aborted).toBe(true);
        await act(async () => finishDiscovery(payload));
        expect(screen.queryByText('Duna')).not.toBeInTheDocument();
    });

    it('offers the correct TV genres and clears a movie-only choice on type change', async () => {
        render(<MemoryRouter initialEntries={['/?genres=28']}><Home /></MemoryRouter>);

        expect(screen.getByLabelText('Gênero')).toHaveValue('28');
        fireEvent.click(screen.getByRole('button', { name: 'Séries' }));
        expect(screen.getByLabelText('Gênero')).toHaveValue('');
        expect(screen.getByRole('option', { name: 'Ação e aventura' })).toHaveValue('10759');
        expect(screen.queryByRole('option', { name: 'Terror' })).not.toBeInTheDocument();
        await screen.findByText('Duna');
    });
});
