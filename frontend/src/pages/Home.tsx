import React, { useCallback, useEffect, useState } from 'react';
import { Film, Search, SlidersHorizontal, Star, ChevronLeft, ChevronRight, Clapperboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { discoverMovies, searchMovies } from '../services/movieApi';
import type { DiscoveryFilters, MediaType, TmdbMovieResult } from '../types/movie';

const genres = [['28', 'Ação'], ['35', 'Comédia'], ['18', 'Drama'], ['27', 'Terror'], ['878', 'Ficção científica'], ['16', 'Animação']];
const initialFilters: DiscoveryFilters = { type: 'movie', sortBy: 'popularity.desc', page: 1 };

const getPosterUrl = (path: string | null) => path ? `https://image.tmdb.org/t/p/w500${path}` : null;

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<TmdbMovieResult[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState<DiscoveryFilters>(initialFilters);
    const [searchType, setSearchType] = useState<MediaType>('all');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadDiscoveries = useCallback(async (nextFilters: DiscoveryFilters) => {
        setLoading(true); setError(null);
        try {
            const data = await discoverMovies(nextFilters);
            setResults(data.results ?? []); setTotalPages(Math.min(data.total_pages ?? 1, 500)); setPage(nextFilters.page ?? 1);
        } catch (err) {
            setResults([]); setError(err instanceof Error ? err.message : 'Não foi possível carregar o catálogo.');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { void loadDiscoveries(initialFilters); }, [loadDiscoveries]);

    const handleSearch = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!query.trim()) return;
        setLoading(true); setError(null);
        try {
            const data = await searchMovies(query.trim(), 1, searchType, filters.minRating);
            const nextResults = (data.results ?? []).filter((item) => item.media_type !== 'person');
            setResults(nextResults); setTotalPages(Math.min(data.total_pages ?? 1, 500)); setPage(1);
            if (!nextResults.length) setError('Nenhum título encontrado. Tente outro termo.');
        } catch (err) { setResults([]); setError(err instanceof Error ? err.message : 'Não foi possível pesquisar agora.'); }
        finally { setLoading(false); }
    };

    const applyFilters = (event: React.FormEvent) => {
        event.preventDefault();
        if (query.trim()) {
            setLoading(true); setError(null);
            void searchMovies(query.trim(), 1, searchType, filters.minRating).then((data) => {
                const nextResults = (data.results ?? []).filter((item) => item.media_type !== 'person');
                setResults(nextResults); setTotalPages(Math.min(data.total_pages ?? 1, 500)); setPage(1);
                if (!nextResults.length) setError('Nenhum título encontrado com esses filtros.');
            }).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Não foi possível pesquisar agora.')).finally(() => setLoading(false));
            return;
        }
        const next = { ...filters, page: 1 }; setFilters(next); void loadDiscoveries(next);
    };

    const changePage = (nextPage: number) => {
        if (nextPage < 1 || nextPage > totalPages || loading) return;
        if (query.trim()) {
            setLoading(true); setError(null);
            void searchMovies(query, nextPage, searchType, filters.minRating).then((data) => {
                setResults((data.results ?? []).filter((item) => item.media_type !== 'person'));
                setTotalPages(Math.min(data.total_pages ?? 1, 500)); setPage(nextPage);
            }).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Não foi possível pesquisar agora.')).finally(() => setLoading(false));
        } else { const next = { ...filters, page: nextPage }; setFilters(next); void loadDiscoveries(next); }
    };

    const title = query ? `Resultados para “${query}”` : 'Em alta agora';
    const typeLabel = (item: TmdbMovieResult) => item.media_type === 'tv' ? 'Série' : 'Filme';

    return <div className="min-h-dvh bg-[#0c0c0e] text-stone-100">
        <header className="border-b border-white/10 bg-[#101014]">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
                <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2 text-left" aria-label="Ir para a página inicial">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-orange-500 text-zinc-950"><Film size={21} strokeWidth={2.5} /></span>
                    <span className="text-lg font-bold text-white">CineSearch</span>
                </button>
            </div>
        </header>

        <main className="mx-auto max-w-7xl px-5 pb-14 pt-10 sm:px-8 sm:pt-16">
            <section className="max-w-3xl">
                <p className="mb-3 text-sm font-semibold text-orange-400">CATÁLOGO TMDB</p>
                <h1 className="text-balance text-4xl font-bold leading-tight text-white sm:text-5xl">Encontre filmes e séries.</h1>
                <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-stone-400">Pesquise títulos, use filtros e veja os detalhes do catálogo.</p>
            </section>

            <form onSubmit={handleSearch} className="mt-8 flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#17171b] p-2 shadow-lg sm:flex-row">
                <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
                    <Search size={20} className="shrink-0 text-stone-500" aria-hidden="true" />
                    <input className="min-w-0 flex-1 border-0 bg-transparent p-2 text-base text-white placeholder:text-stone-500 focus:ring-0" placeholder="Busque por título, série ou ator" value={query} onChange={(event) => setQuery(event.target.value)} />
                </label>
                <div className="flex gap-2">
                    <select aria-label="Tipo da busca" value={searchType} onChange={(event) => setSearchType(event.target.value as MediaType)} className="rounded-xl border-0 bg-[#24242a] px-3 text-sm text-stone-200 focus:ring-orange-500">
                        <option value="all">Tudo</option><option value="movie">Filmes</option><option value="tv">Séries</option>
                    </select>
                    <button className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-zinc-950 hover:bg-orange-400" type="submit">Buscar</button>
                </div>
            </form>

            <form onSubmit={applyFilters} className="mt-5 border-y border-white/10 py-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-300"><SlidersHorizontal size={16} aria-hidden="true" /> Filtros</div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <select aria-label="Tipo para descobrir" value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value as 'movie' | 'tv' })} className="rounded-lg border-white/10 bg-[#17171b] text-sm text-stone-200 focus:border-orange-500 focus:ring-orange-500"><option value="movie">Filmes</option><option value="tv">Séries</option></select>
                    <select aria-label="Gênero" value={filters.genres ?? ''} onChange={(event) => setFilters({ ...filters, genres: event.target.value || undefined })} className="rounded-lg border-white/10 bg-[#17171b] text-sm text-stone-200 focus:border-orange-500 focus:ring-orange-500"><option value="">Todos os gêneros</option>{genres.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
                    <input aria-label="Ano" type="number" min="1888" max="2100" placeholder="Ano de lançamento" value={filters.year ?? ''} onChange={(event) => setFilters({ ...filters, year: event.target.value ? Number(event.target.value) : undefined })} className="rounded-lg border-white/10 bg-[#17171b] text-sm text-stone-200 placeholder:text-stone-500 focus:border-orange-500 focus:ring-orange-500" />
                    <select aria-label="Nota mínima" value={filters.minRating ?? ''} onChange={(event) => setFilters({ ...filters, minRating: event.target.value ? Number(event.target.value) : undefined })} className="rounded-lg border-white/10 bg-[#17171b] text-sm text-stone-200 focus:border-orange-500 focus:ring-orange-500"><option value="">Qualquer nota</option>{[5, 6, 7, 8, 9].map((rating) => <option key={rating} value={rating}>Nota {rating}+</option>)}</select>
                    <div className="flex gap-2"><select aria-label="Ordenação" value={filters.sortBy} onChange={(event) => setFilters({ ...filters, sortBy: event.target.value as DiscoveryFilters['sortBy'] })} className="min-w-0 flex-1 rounded-lg border-white/10 bg-[#17171b] text-sm text-stone-200 focus:border-orange-500 focus:ring-orange-500"><option value="popularity.desc">Mais populares</option><option value="vote_average.desc">Melhor avaliados</option><option value="primary_release_date.desc">Mais recentes</option></select><button type="submit" className="rounded-lg border border-orange-500 px-4 text-sm font-semibold text-orange-400 hover:bg-orange-500 hover:text-zinc-950">Aplicar</button></div>
                </div>
            </form>

            <section className="mt-10" aria-live="polite">
                <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-sm text-stone-500">Página {page} de {totalPages}</p><h2 className="text-balance mt-1 text-2xl font-bold text-white">{title}</h2></div>{!loading && <span className="hidden text-sm text-stone-500 sm:block">{results.length} títulos nesta página</span>}</div>
                {error ? <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-6"><p className="font-semibold text-orange-300">{error}</p><button type="button" onClick={() => void loadDiscoveries(initialFilters)} className="mt-3 text-sm font-semibold text-white underline underline-offset-4">Voltar ao catálogo</button></div> : loading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{Array.from({ length: 12 }, (_, index) => <div key={index} className="aspect-[2/3] rounded-xl bg-[#202026]" />)}</div> : <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">{results.filter((item) => item.media_type !== 'person').map((item) => <button key={item.id} className="poster-card group text-left" onClick={() => navigate(`/movie/${item.id}?type=${item.media_type || filters.type}`)} type="button"><div className="aspect-[2/3] overflow-hidden rounded-xl bg-[#202026] shadow-md">{getPosterUrl(item.poster_path) ? <img alt={item.title || item.name} className="h-full w-full object-cover" src={getPosterUrl(item.poster_path)!} /> : <div className="flex h-full flex-col items-center justify-center gap-2 text-stone-500"><Clapperboard size={28} /><span className="text-xs">Sem poster</span></div>}</div><p className="mt-3 truncate font-semibold text-white group-hover:text-orange-400">{item.title || item.name}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">{item.vote_average != null && <><Star size={13} className="fill-orange-400 text-orange-400" /><span className="tabular-nums text-stone-300">{item.vote_average.toFixed(1)}</span><span aria-hidden="true">·</span></>}{typeLabel(item)} · {(item.release_date || item.first_air_date)?.slice(0, 4) || 'Data indisponível'}</p></button>)}</div>}
                {!loading && !error && results.length > 0 && <nav aria-label="Paginação" className="mt-12 flex items-center justify-center gap-4"><button aria-label="Página anterior" disabled={page === 1} onClick={() => changePage(page - 1)} className="flex size-10 items-center justify-center rounded-lg border border-white/10 text-stone-200 disabled:opacity-30"><ChevronLeft size={19} /></button><span className="text-sm tabular-nums text-stone-400">{page} / {totalPages}</span><button aria-label="Próxima página" disabled={page === totalPages} onClick={() => changePage(page + 1)} className="flex size-10 items-center justify-center rounded-lg border border-white/10 text-stone-200 disabled:opacity-30"><ChevronRight size={19} /></button></nav>}
            </section>
        </main>
    </div>;
};
export default Home;
