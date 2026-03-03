import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMovies } from '../services/movieApi';
import { TmdbMovieResult } from '../types/movie';

const Home: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<TmdbMovieResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                const data = await searchMovies('Batman');
                setResults(data?.results ?? []);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const handleSearch = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        try {
            const data = await searchMovies(query);
            const filtered = (data?.results ?? []).filter((item) => item.media_type !== 'person');
            if (filtered.length === 0) {
                setResults([]);
                setError('Nenhum resultado encontrado para filmes ou séries.');
            } else {
                setResults(filtered);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('Erro ao buscar títulos:', err);
            setError(
                message.includes('Failed to fetch') || message.includes('NetworkError')
                    ? 'Não foi possível conectar à API. Inicie o backend em src/MovieAPI.API na porta 5171.'
                    : `Erro ao buscar dados. ${message}`
            );
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const getPosterUrl = (path: string | null) => {
        if (!path) return null;
        return `https://image.tmdb.org/t/p/w500${path}`;
    };

    const title = query.trim() ? `Resultados para "${query}"` : 'Filmes e Séries';

    return (
        <div className="min-h-screen bg-background-dark text-slate-100">
            <header className="border-b border-white/10 px-6 py-5">
                <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
                    <button className="flex items-center gap-2 text-primary" onClick={() => navigate('/')}>
                        <span className="material-symbols-outlined text-3xl">movie_filter</span>
                        <span className="text-2xl font-black tracking-tight text-white">CineSearch</span>
                    </button>
                    <span className="rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                        Projeto Acadêmico
                    </span>
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl px-6 py-8">
                <form onSubmit={handleSearch} className="mb-8 flex w-full items-center rounded-xl border border-white/10 bg-neutral-dark px-4 py-3">
                    <span className="material-symbols-outlined text-slate-400">search</span>
                    <input
                        className="w-full bg-transparent px-2 text-white outline-none placeholder:text-slate-500"
                        placeholder="Buscar filmes ou séries (ex.: Breaking Bad, Duna, The Batman)"
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90" type="submit">
                        Buscar
                    </button>
                </form>

                <div className="mb-6 flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white">{title}</h1>
                    <span className="h-1 w-12 rounded-full bg-primary" />
                </div>

                {loading ? (
                    <div className="py-20 text-center">
                        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                        <p className="mt-3 text-slate-300">Buscando dados...</p>
                    </div>
                ) : error ? (
                    <div className="rounded-xl border border-primary/20 bg-primary/10 p-8 text-center font-semibold text-primary">
                        {error}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {results.filter((item) => item.media_type !== 'person').map((item) => (
                            <button
                                key={item.id}
                                className="group text-left"
                                onClick={() => navigate(`/movie/${item.id}?type=${item.media_type || 'movie'}`)}
                                type="button"
                            >
                                <div className="relative mb-3 aspect-[2/3] overflow-hidden rounded-xl bg-neutral-dark shadow-lg">
                                    {getPosterUrl(item.poster_path) ? (
                                        <img
                                            alt={item.title || item.name}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            src={getPosterUrl(item.poster_path)!}
                                        />
                                    ) : (
                                        <div className="flex h-full w-full flex-col items-center justify-center text-slate-500">
                                            <span className="material-symbols-outlined text-4xl">movie</span>
                                            <span className="text-xs">Sem imagem</span>
                                        </div>
                                    )}
                                </div>
                                <h2 className="truncate font-semibold text-white group-hover:text-primary">
                                    {item.title || item.name}
                                </h2>
                                <p className="text-xs text-slate-400">
                                    {item.media_type === 'tv' ? 'Série' : 'Filme'}
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Home;
