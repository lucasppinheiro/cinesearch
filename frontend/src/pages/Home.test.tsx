import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
        discoverMoviesMock.mockResolvedValue(payload);
    });

    it('loads discovery results and sends selected filters', async () => {
        render(<MemoryRouter><Home /></MemoryRouter>);
        expect(await screen.findByText('Duna')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Ano'), { target: { value: '2024' } });
        fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

        await waitFor(() => expect(discoverMoviesMock).toHaveBeenLastCalledWith(expect.objectContaining({ year: 2024, page: 1 })));
    });

    it('moves to the requested page', async () => {
        render(<MemoryRouter><Home /></MemoryRouter>);
        await screen.findByText('Duna');
        fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));

        await waitFor(() => expect(discoverMoviesMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    });

    it('shows a friendly message when search fails', async () => {
        discoverMoviesMock.mockRejectedValueOnce(new Error('Catálogo indisponível'));
        searchMoviesMock.mockResolvedValue(payload);
        render(<MemoryRouter><Home /></MemoryRouter>);

        expect(await screen.findByText('Catálogo indisponível')).toBeInTheDocument();
    });
});
