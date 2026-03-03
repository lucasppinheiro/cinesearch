import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getMovieDetails } from '../services/movieApi';
import { TmdbMovieDetails } from '../types/movie';

const MovieDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const type = queryParams.get('type') || 'movie';
    const [movie, setMovie] = useState<TmdbMovieDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!id) return;

            try {
                const data = await getMovieDetails(id, type);
                if (data && data.id) {
                    setMovie(data);
                } else {
                    setError('Filme não encontrado.');
                }
            } catch {
                setError('Erro ao carregar os detalhes.');
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
        window.scrollTo(0, 0);
    }, [id, type]);

    const getImageUrl = (path: string | null | undefined, size: string = 'w500') => {
        if (!path) return null;
        return `https://image.tmdb.org/t/p/${size}${path}`;
    };

    if (loading) return (
        <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center text-white gap-4">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
            <p>Carregando detalhes...</p>
        </div>
    );

    if (error || !movie) return (
        <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center text-white">
            <div className="bg-primary/10 border border-primary/20 p-8 rounded-xl text-center max-w-md">
                <span className="material-symbols-outlined text-error text-5xl mb-4">error</span>
                <h2 className="text-xl font-bold mb-2">Ops!</h2>
                <p className="text-slate-400 mb-6">{error || 'Filme não encontrado'}</p>
                <button
                    onClick={() => navigate('/')}
                    className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                    Voltar para Home
                </button>
            </div>
        </div>
    );

    const director = type === 'tv' && movie.created_by && movie.created_by.length > 0
        ? movie.created_by.map(c => c.name).join(', ')
        : movie.credits?.crew?.find(c => c.job === 'Director')?.name || 'Desconhecido';

    const majorCast = movie.credits?.cast?.slice(0, 5) || [];
    const genres = movie.genres?.map(g => g.name).join(', ') || 'Nenhum';
    const releaseYear = (movie.release_date || movie.first_air_date)
        ? new Date((movie.release_date || movie.first_air_date)!).getFullYear()
        : 'N/A';

    const backdropUrl = getImageUrl(movie.backdrop_path, 'original') || getImageUrl(movie.poster_path, 'original');

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
            <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-6 md:px-10 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between whitespace-nowrap">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2 text-primary cursor-pointer border-r border-white/10 pr-6" onClick={() => navigate(-1)}>
                            <span className="material-symbols-outlined text-2xl">arrow_back</span>
                            <span className="text-white text-sm font-bold tracking-tight hidden md:inline">Voltar</span>
                        </div>
                        <div className="flex items-center gap-2 text-primary cursor-pointer" onClick={() => navigate('/')}>
                            <span className="material-symbols-outlined text-3xl">movie_filter</span>
                            <h2 className="text-slate-900 dark:text-white text-xl font-bold leading-tight tracking-tight hidden sm:block">CineSearch</h2>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                <section className="relative w-full aspect-[21/9] min-h-[500px] flex items-end">
                    <div className="absolute inset-0 z-0 bg-neutral-dark">
                        {backdropUrl && (
                            <img className="w-full h-full object-cover opacity-60" alt={movie.title || movie.name} src={backdropUrl} />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/60 to-transparent"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-background-dark/90 via-background-dark/50 to-transparent"></div>
                    </div>

                    <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 pb-12">
                        <div className="max-w-3xl space-y-6">
                            <h1 className="text-5xl md:text-7xl font-black text-white leading-tight drop-shadow-lg">
                                {movie.title || movie.name}
                            </h1>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-200 font-medium">
                                <div className="flex items-center gap-1 text-primary">
                                    <span className="material-symbols-outlined fill-1">star</span>
                                    <span className="text-lg">{movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                                </div>
                                <span className="drop-shadow-md">{releaseYear}</span>
                                <span className="px-1.5 py-0.5 border border-slate-500 rounded text-xs bg-black/50 backdrop-blur">
                                    {type === 'tv' ? 'Série' : 'Filme'}
                                </span>
                                {movie.runtime && <span className="drop-shadow-md">{movie.runtime}m</span>}
                                {movie.number_of_seasons && <span className="drop-shadow-md">{movie.number_of_seasons} Temporadas</span>}
                                <span className="drop-shadow-md">{genres}</span>
                            </div>
                            <p className="text-slate-200 text-lg leading-relaxed line-clamp-3 drop-shadow-md max-w-2xl">
                                {movie.overview || 'Sinopse não disponível para este título.'}
                            </p>
                            <p className="text-sm text-slate-300">
                                Dados fornecidos pela API do TMDB para fins acadêmicos.
                            </p>
                        </div>
                    </div>
                </section>

                <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 space-y-16">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2 space-y-12">
                            <section>
                                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-primary rounded-full"></span>
                                    Sinopse
                                </h3>
                                <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
                                    {movie.overview || 'Nenhuma sinopse fornecida pela base de dados para este título.'}
                                </p>
                            </section>

                            {majorCast.length > 0 && (
                                <section>
                                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                        <span className="w-1 h-6 bg-primary rounded-full"></span>
                                        Elenco Principal
                                    </h3>
                                    <div className="flex flex-wrap gap-8">
                                        {majorCast.map((actor, index) => (
                                            <div key={index} className="flex flex-col items-center gap-3 w-24">
                                                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/30 flex-shrink-0 bg-neutral-dark">
                                                    {actor.profile_path ? (
                                                        <img className="w-full h-full object-cover" alt={actor.name} src={getImageUrl(actor.profile_path, 'w185')!} />
                                                    ) : (
                                                        <div className="flex items-center justify-center w-full h-full text-slate-500">
                                                            <span className="material-symbols-outlined text-3xl">person</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-center text-sm font-semibold leading-tight">{actor.name}</p>
                                                <p className="text-center text-xs text-slate-500 leading-tight line-clamp-2">{actor.character}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>

                        <aside className="space-y-6">
                            <h3 className="text-2xl font-bold flex items-center gap-2">
                                <span className="w-1 h-6 bg-primary rounded-full"></span>
                                Detalhes
                            </h3>

                            {movie.poster_path && (
                                <div className="hidden lg:block aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-white/10 w-48 mb-6">
                                    <img className="w-full h-full object-cover" alt="Poster" src={getImageUrl(movie.poster_path)!} />
                                </div>
                            )}

                            <div className="bg-slate-200 dark:bg-primary/5 border border-primary/10 p-6 rounded-xl space-y-4">
                                <h4 className="font-bold border-b border-primary/20 pb-2 text-white">Ficha Técnica</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="col-span-2">
                                        <p className="text-slate-500">{type === 'tv' ? 'Criador' : 'Diretor'}</p>
                                        <p className="font-semibold text-white">{director}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Lançamento</p>
                                        <p className="font-semibold text-white">{releaseYear}</p>
                                    </div>
                                    {movie.budget ? (
                                        <div>
                                            <p className="text-slate-500">Orçamento</p>
                                            <p className="font-semibold text-white">${(movie.budget / 1000000).toFixed(1)}M</p>
                                        </div>
                                    ) : null}
                                    {movie.revenue ? (
                                        <div>
                                            <p className="text-slate-500">Bilheteria</p>
                                            <p className="font-semibold text-white">${(movie.revenue / 1000000).toFixed(1)}M</p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>

            <footer className="bg-slate-200 dark:bg-background-dark/50 border-t border-primary/10 py-12 px-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 text-primary">
                        <span className="material-symbols-outlined text-2xl">movie_filter</span>
                        <h2 className="text-lg font-bold text-white">CineSearch</h2>
                    </div>
                    <p className="text-slate-500 text-xs text-center md:text-left">© 2026 CineSearch. powered by TMDB.</p>
                </div>
            </footer>
        </div>
    );
};

export default MovieDetails;
