import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { ChevronLeft, ChevronRight, Clapperboard, Film, Search, SlidersHorizontal, Star } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { discoverMovies, searchMovies } from '../services/movieApi';
import type { DiscoveryFilters } from '../types/movie';
import { useRequest } from '../utils/useRequest';

const genresByType = {
    movie: [['28', 'Ação'], ['35', 'Comédia'], ['18', 'Drama'], ['27', 'Terror'], ['878', 'Ficção científica'], ['16', 'Animação']],
    tv: [['10759', 'Ação e aventura'], ['35', 'Comédia'], ['18', 'Drama'], ['10765', 'Ficção científica e fantasia'], ['16', 'Animação']],
};

const sorts = {
    'popularity.desc': 'Mais populares',
    'popularity.asc': 'Menos populares',
    'vote_average.desc': 'Melhor avaliados',
    'primary_release_date.desc': 'Mais recentes',
};

const defaultSort = 'popularity.desc';
const filterClass = 'min-w-0 rounded-lg border-white/10 bg-[#17171b] text-sm text-stone-200 focus:border-orange-500 focus:ring-orange-500';

function boundedNumber(value: string | null, min: number, max: number, integer = false) {
    if (!value?.trim()) return undefined;
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max || (integer && !Number.isInteger(number))) return undefined;
    return number;
}

function addField(params: URLSearchParams, values: FormData, key: string) {
    const value = values.get(key);
    if (typeof value === 'string' && value.trim()) params.set(key, value.trim());
}

function RatingFilter({ value }: { value?: number }) {
    const ratings = [...new Set([5, 6, 7, 8, 9, ...(value === undefined ? [] : [value])])].sort((a, b) => a - b);
    return <select className={filterClass} aria-label="Nota mínima" name="minRating" defaultValue={value ?? ''}>
        <option value="">Qualquer nota</option>
        {ratings.map(rating => <option key={rating} value={rating}>Nota {rating}+</option>)}
    </select>;
}

function DiscoveryForm({ filters, onSubmit }: { filters: DiscoveryFilters; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
    const [type, setType] = useState(filters.type);
    const [genre, setGenre] = useState(filters.genres ?? '');

    return <form onSubmit={onSubmit} className="mt-5 border-y border-white/10 py-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-300"><SlidersHorizontal size={16} aria-hidden="true" /> Filtros</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <select className={filterClass} aria-label="Tipo para descobrir" name="type" value={type} onChange={event => {
                const nextType = event.target.value === 'tv' ? 'tv' : 'movie';
                setType(nextType);
                if (!genresByType[nextType].some(([id]) => id === genre)) setGenre('');
            }}>
                <option value="movie">Filmes</option>
                <option value="tv">Séries</option>
            </select>
            <select className={filterClass} aria-label="Gênero" name="genres" value={genre} onChange={event => setGenre(event.target.value)}>
                <option value="">Todos os gêneros</option>
                {genresByType[type].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <input className={filterClass + ' placeholder:text-stone-400'} aria-label="Ano" name="year" type="number" min="1888" max="2100" placeholder="Ano de lançamento" defaultValue={filters.year ?? ''} />
            <RatingFilter value={filters.minRating} />
            <div className="flex min-w-0 gap-2">
                <select className={filterClass + ' flex-1'} aria-label="Ordenação" name="sortBy" defaultValue={filters.sortBy}>
                    {Object.entries(sorts).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                </select>
                <button type="submit" className="rounded-lg border border-orange-500 px-4 text-sm font-semibold text-orange-400 hover:bg-orange-500 hover:text-zinc-950">Aplicar</button>
            </div>
        </div>
    </form>;
}

export default function Home() {
    const location = useLocation();
    const [params, setParams] = useSearchParams();
    const catalogLocation = location.pathname + location.search;
    const query = params.get('query')?.trim().slice(0, 100) ?? '';
    const type = params.get('type');
    const searchType = type === 'tv' || type === 'movie' ? type : 'all';
    const discoveryType = type === 'tv' ? 'tv' : 'movie';
    const genre = params.get('genres');
    const genres = genresByType[discoveryType].some(([id]) => id === genre) ? genre ?? undefined : undefined;
    const year = boundedNumber(params.get('year'), 1888, 2100, true);
    const minRating = boundedNumber(params.get('minRating'), 0, 10);
    const sort = params.get('sortBy');
    const sortBy = sort && Object.hasOwn(sorts, sort) ? sort as keyof typeof sorts : defaultSort;
    const page = boundedNumber(params.get('page'), 1, 500, true) ?? 1;
    const load = useCallback((signal: AbortSignal) => query
        ? searchMovies(query, page, searchType, minRating, signal)
        : discoverMovies({ type: discoveryType, genres, year, minRating, sortBy, page }, signal),
    [query, page, searchType, minRating, discoveryType, genres, year, sortBy]);

    const { result, retry } = useRequest(load);
    const data = result?.data;
    const error = result?.error;
    const totalPages = Math.max(1, Math.min(data?.total_pages ?? 1, 500));
    const fallbackType = query ? searchType : discoveryType;
    const tiles = (data?.results ?? []).flatMap(item => {
        const mediaType = item.media_type ?? fallbackType;
        return mediaType === 'movie' || mediaType === 'tv' ? [{ item, mediaType }] : [];
    });

    function submitSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        const next = new URLSearchParams();
        addField(next, values, 'query');
        if (!next.has('query')) {
            if (query) setParams({});
            return;
        }
        addField(next, values, 'type');
        addField(next, values, 'minRating');
        if (!query && minRating !== undefined) next.set('minRating', String(minRating));
        setParams(next);
    }

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        const next = new URLSearchParams();
        for (const key of ['type', 'genres', 'year', 'minRating', 'sortBy']) addField(next, values, key);
        setParams(next);
    }

    function changePage(nextPage: number) {
        const next = new URLSearchParams(params);
        if (nextPage === 1) next.delete('page');
        else next.set('page', String(nextPage));
        setParams(next);
    }

    return <div className="bg-[#0c0c0e] text-stone-100">
        <header className="border-b border-white/10 bg-[#101014]">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
                <Link to="/" className="flex items-center gap-2 text-left" aria-label="CineSearch, página inicial">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-orange-500 text-zinc-950"><Film size={21} strokeWidth={2.5} aria-hidden="true" /></span>
                    <span className="text-lg font-bold text-white">CineSearch</span>
                </Link>
            </div>
        </header>

        <main className="mx-auto max-w-7xl px-5 pb-14 pt-10 sm:px-8 sm:pt-16">
            <section className="max-w-3xl">
                <p className="mb-3 text-sm font-semibold text-orange-400">CATÁLOGO TMDB</p>
                <h1 className="text-balance text-4xl font-bold leading-tight text-white sm:text-5xl">Encontre filmes e séries.</h1>
                <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-stone-400">Pesquise títulos, use filtros e veja os detalhes do catálogo.</p>
            </section>

            <form key={JSON.stringify([query, searchType, minRating])} onSubmit={submitSearch} role="search" className="mt-8 flex flex-col flex-wrap gap-2 rounded-2xl border border-white/10 bg-[#17171b] p-2 shadow-lg sm:flex-row">
                <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
                    <span className="sr-only">Busca por título, série ou ator</span>
                    <Search size={20} className="shrink-0 text-stone-400" aria-hidden="true" />
                    <input type="search" name="query" maxLength={100} className="min-w-0 flex-1 border-0 bg-transparent p-2 text-base text-white placeholder:text-stone-400 focus:ring-0" placeholder="Busque por título, série ou ator" defaultValue={query} />
                </label>
                <div className="flex flex-wrap gap-2">
                    <select aria-label="Tipo da busca" name="type" defaultValue={searchType} className="rounded-xl border-0 bg-[#24242a] px-3 text-sm text-stone-200 focus:ring-orange-500">
                        <option value="all">Tudo</option><option value="movie">Filmes</option><option value="tv">Séries</option>
                    </select>
                    {query && <RatingFilter value={minRating} />}
                    <button className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-zinc-950 hover:bg-orange-400" type="submit">Buscar</button>
                </div>
            </form>

            {query
                ? <Link to="/" className="mt-4 inline-block text-sm font-semibold text-orange-400 underline underline-offset-4">Limpar busca</Link>
                : <DiscoveryForm key={JSON.stringify([discoveryType, genres, year, minRating, sortBy])} filters={{ type: discoveryType, genres, year, minRating, sortBy }} onSubmit={submitFilters} />}

            <section className="mt-10" aria-labelledby="catalog-title">
                <div className="mb-6 flex items-end justify-between gap-4">
                    <div>
                        {data && totalPages > 1 && <p className="text-sm text-stone-400">Página {page} de {totalPages}</p>}
                        <h2 id="catalog-title" className="text-balance mt-1 text-2xl font-bold text-white">{query ? 'Resultados para “' + query + '”' : 'Em alta agora'}</h2>
                    </div>
                    {data && <span className="hidden text-sm text-stone-400 sm:block">{tiles.length} títulos nesta página</span>}
                </div>
                {error && <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-6">
                    <p role="alert" className="font-semibold text-orange-300">{error.message}</p>
                    <button type="button" onClick={retry} className="mt-3 text-sm font-semibold text-white underline underline-offset-4">Tentar novamente</button>
                </div>}
                {!result && <>
                    <p role="status" className="sr-only">Carregando catálogo…</p>
                    <div aria-hidden="true" className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {Array.from({ length: 12 }, (_, index) => <div key={index} className="aspect-[2/3] rounded-xl bg-[#202026]" />)}
                    </div>
                </>}
                {data && !tiles.length && <p role="status" className="text-stone-300">Nenhum título encontrado nesta página.</p>}
                {data && tiles.length > 0 && <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {tiles.map(({ item, mediaType }, index) => <Link key={mediaType + ':' + item.id} className="poster-card group min-w-0 text-left" to={'/movie/' + item.id + '?type=' + mediaType} state={{ catalogLocation }}>
                        <div className="aspect-[2/3] overflow-hidden rounded-xl bg-[#202026] shadow-md">
                            {item.poster_path
                                ? <img alt="" className="h-full w-full object-cover" loading={index < 6 ? undefined : 'lazy'} src={'https://image.tmdb.org/t/p/w342' + item.poster_path} />
                                : <div aria-hidden="true" className="flex h-full flex-col items-center justify-center gap-2 text-stone-400"><Clapperboard size={28} /><span className="text-xs">Sem pôster</span></div>}
                        </div>
                        <p className="mt-3 truncate font-semibold text-white group-hover:text-orange-400">{item.title || item.name || 'Sem título'}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-400">
                            {item.vote_average != null && <><Star size={13} className="fill-orange-400 text-orange-400" aria-hidden="true" /><span className="tabular-nums text-stone-300">{item.vote_average.toFixed(1)}</span><span aria-hidden="true">·</span></>}
                            {mediaType === 'tv' ? 'Série' : 'Filme'} · {(item.release_date || item.first_air_date)?.slice(0, 4) || 'Data indisponível'}
                        </p>
                    </Link>)}
                </div>}
                {data && (totalPages > 1 || page > 1) && <nav aria-label="Paginação" className="mt-12 flex items-center justify-center gap-4">
                    <button type="button" aria-label="Página anterior" disabled={page <= 1} onClick={() => changePage(Math.min(page - 1, totalPages))} className="flex size-10 items-center justify-center rounded-lg border border-white/10 text-stone-200 disabled:opacity-30"><ChevronLeft size={19} aria-hidden="true" /></button>
                    <span className="text-sm tabular-nums text-stone-400">{page} / {totalPages}</span>
                    <button type="button" aria-label="Próxima página" disabled={page >= totalPages} onClick={() => changePage(page + 1)} className="flex size-10 items-center justify-center rounded-lg border border-white/10 text-stone-200 disabled:opacity-30"><ChevronRight size={19} aria-hidden="true" /></button>
                </nav>}
            </section>
        </main>
    </div>;
}
