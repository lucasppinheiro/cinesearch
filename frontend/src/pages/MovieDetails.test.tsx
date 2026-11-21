import { fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { getMovieDetails } from '../services/movieApi';
import type { TmdbMovieDetails } from '../types/movie';
import MovieDetails from './MovieDetails';

vi.mock('../services/movieApi', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../services/movieApi')>()),
    getMovieDetails: vi.fn(),
}));

const getDetails = vi.mocked(getMovieDetails);
const title: TmdbMovieDetails = {
    id: 1, title: 'Duna', runtime: 155, overview: '', vote_average: 8, genres: [],
    credits: { cast: [], crew: [] }, recommendations: {
        page: 1, total_results: 1, results: [{ id: 2, title: 'Outra história', poster_path: null }],
    },
};

beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

it('resets a failed recommendation when navigating back to a valid title', async () => {
    getDetails.mockImplementation(id => id === '1' ? Promise.resolve(title) : Promise.reject(new Error('Catálogo indisponível')));
    render(<MemoryRouter initialEntries={[{ pathname: '/movie/1', state: { catalogLocation: '/?query=Duna' } }]}>
        <Link to="/movie/1">Título original</Link>
        <Routes><Route path="/movie/:id" element={<MovieDetails />} /></Routes>
    </MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Duna' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /Outra história/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Catálogo indisponível');
    expect(screen.getByRole('link', { name: 'Voltar ao catálogo' })).toHaveAttribute('href', '/?query=Duna');
    fireEvent.click(screen.getByRole('link', { name: 'Título original' }));
    expect(await screen.findByRole('heading', { name: 'Duna' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao catálogo' })).toHaveAttribute('href', '/');
});

it('keeps the link back to the catalog available while loading', () => {
    getDetails.mockImplementation(() => new Promise(() => {}));
    render(<MemoryRouter initialEntries={[{ pathname: '/movie/1', state: { catalogLocation: '/?page=2' } }]}>
        <Routes><Route path="/movie/:id" element={<MovieDetails />} /></Routes>
    </MemoryRouter>);

    expect(screen.getByRole('status')).toHaveTextContent('Carregando detalhes');
    expect(screen.getByRole('link', { name: 'Voltar ao catálogo' })).toHaveAttribute('href', '/?page=2');
});

it('shows the technical summary before recommendations in reading order', async () => {
    getDetails.mockResolvedValue(title);
    render(<MemoryRouter initialEntries={['/movie/1']}>
        <Routes><Route path="/movie/:id" element={<MovieDetails />} /></Routes>
    </MemoryRouter>);

    await screen.findByRole('heading', { name: 'Duna' });
    const summary = screen.getByRole('heading', { name: 'Ficha técnica' });
    const recommendations = screen.getByRole('heading', { name: 'Se você gostou deste' });
    expect(summary.compareDocumentPosition(recommendations) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
