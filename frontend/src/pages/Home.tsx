import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, MouseEvent, RefObject } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import { Link, useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import Poster from '../components/Poster';
import SiteHeader from '../components/SiteHeader';
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
const discoveryFields = ['genres', 'year', 'minRating', 'sortBy'] as const;
const discoveryTypes = [
    { value: 'movie', label: 'Filmes' },
    { value: 'tv', label: 'Séries' },
] as const;
const ratingFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export type CatalogBookmark = { url: string; entry: string; cardId: string; scrollY: number };

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
    return <select className="catalog-field" aria-label="Nota mínima" name="minRating" defaultValue={value ?? ''}>
        <option value="">Qualquer nota</option>
        {ratings.map(rating => <option key={rating} value={rating}>Nota {rating}+</option>)}
    </select>;
}

function DiscoveryForm({ filters, onSubmit }: { filters: DiscoveryFilters; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
    const [open, setOpen] = useState(false);

    return <form className="discovery-form" onSubmit={event => {
        onSubmit(event);
        setOpen(false);
    }}>
        <button type="button" className="quiet-button md:hidden" aria-expanded={open} aria-controls="discovery-fields" onClick={() => setOpen(!open)}>
            <SlidersHorizontal size={16} aria-hidden="true" /> Filtros
        </button>
        <div id="discovery-fields" className={(open ? 'grid' : 'hidden') + ' discovery-fields md:flex'}>
            <select className="catalog-field" aria-label="Gênero" name="genres" defaultValue={filters.genres ?? ''}>
                <option value="">Todos os gêneros</option>
                {genresByType[filters.type].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <input className="catalog-field" aria-label="Ano" name="year" type="number" min="1888" max="2100" placeholder="Ano de lançamento" defaultValue={filters.year ?? ''} />
            <RatingFilter value={filters.minRating} />
            <select className="catalog-field" aria-label="Ordenação" name="sortBy" defaultValue={filters.sortBy}>
                {Object.entries(sorts).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
            </select>
            <button type="submit" className="quiet-button">Aplicar</button>
        </div>
    </form>;
}

export default function Home({ bookmarkRef }: { bookmarkRef?: RefObject<CatalogBookmark | null> } = {}) {
    const location = useLocation();
    const navigationType = useNavigationType();
    const heading = useRef<HTMLHeadingElement>(null);
    const searchInput = useRef<HTMLInputElement>(null);
    const lastFocused = useRef<string>(null);
    const [params, setParams] = useSearchParams();
    const catalogLocation = location.pathname + location.search;
    const query = params.get('query')?.trim().slice(0, 100) ?? '';
    const type = params.get('type');
    const searchType = query && (type === 'tv' || type === 'movie') ? type : 'all';
    const discoveryType = type === 'tv' ? 'tv' : 'movie';
    const genre = genresByType[discoveryType].find(([id]) => id === params.get('genres'));
    const genres = genre?.[0];
    const year = boundedNumber(params.get('year'), 1888, 2100, true);
    const minRating = boundedNumber(params.get('minRating'), 0, 10);
    const sort = params.get('sortBy');
    const sortBy = sort && Object.prototype.hasOwnProperty.call(sorts, sort) ? sort as keyof typeof sorts : defaultSort;
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
    const activeFilters = [
        { key: 'genres', label: !query ? genre?.[1] : undefined },
        { key: 'year', label: !query && year ? String(year) : undefined },
        { key: 'minRating', label: minRating !== undefined ? 'Nota ' + minRating + '+' : undefined },
        { key: 'sortBy', label: !query && sortBy !== defaultSort ? sorts[sortBy] : undefined },
    ].filter(filter => filter.label !== undefined);
    const selection = discoveryType === 'tv' ? 'Séries' : 'Filmes';
    const headingText = query ? 'Resultados para “' + query + '”' : activeFilters.length ? selection + ' no catálogo' : 'Em alta agora';

    useEffect(() => {
        const saved = bookmarkRef?.current;
        const returning = saved?.url === catalogLocation && (
            (navigationType === 'POP' && saved.entry === location.key) || location.state?.restoreCatalog === true
        );

        if (bookmarkRef && returning && saved) {
            if (!result) return;
            const card = document.getElementById(saved.cardId);
            if (card) {
                window.scrollTo(0, saved.scrollY);
                card.focus({ preventScroll: true });
                const bounds = card.getBoundingClientRect();
                if (bounds.bottom < 0 || bounds.top >= window.innerHeight) card.scrollIntoView?.({ block: 'nearest' });
            } else {
                heading.current?.focus({ preventScroll: true });
                heading.current?.scrollIntoView?.({ block: 'start' });
            }
            bookmarkRef.current = null;
            lastFocused.current = location.key;
            return;
        }

        if (lastFocused.current !== location.key && navigationType !== 'POP' && location.state?.focusCatalog === true) {
            lastFocused.current = location.key;
            heading.current?.focus({ preventScroll: true });
            heading.current?.scrollIntoView?.({ block: 'start' });
        }
    }, [bookmarkRef, catalogLocation, location.key, location.state, navigationType, result]);

    function showResults(next: URLSearchParams) {
        setParams(next, { state: { focusCatalog: true } });
    }

    function submitSearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        const next = new URLSearchParams();
        addField(next, values, 'query');
        if (!next.has('query')) {
            if (query) showResults(next);
            return;
        }
        addField(next, values, 'type');
        addField(next, values, 'minRating');
        showResults(next);
    }

    function submitFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        const next = new URLSearchParams({ type: discoveryType });
        for (const key of discoveryFields) addField(next, values, key);
        showResults(next);
    }

    function changeDiscoveryType(nextType: DiscoveryFilters['type']) {
        if (nextType === discoveryType) return;
        const next = new URLSearchParams(params);
        next.set('type', nextType);
        next.delete('page');
        if (!genresByType[nextType].some(([id]) => id === genres)) next.delete('genres');
        setParams(next);
    }

    function clearFilters() {
        showResults(new URLSearchParams({ type: discoveryType }));
    }

    function removeFilter(key: string) {
        const next = new URLSearchParams(params);
        next.delete(key);
        next.delete('page');
        showResults(next);
    }

    function changePage(nextPage: number) {
        const next = new URLSearchParams(params);
        if (nextPage === 1) next.delete('page');
        else next.set('page', String(nextPage));
        showResults(next);
    }

    function rememberCard(event: MouseEvent<HTMLAnchorElement>) {
        if (bookmarkRef && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
            bookmarkRef.current = { url: catalogLocation, entry: location.key, cardId: event.currentTarget.id, scrollY: window.scrollY };
        }
    }

    return <>
        <SiteHeader />
        <main className="site-width catalog-page">
            <section className={'catalog-hero' + (query ? ' catalog-hero-compact' : '')} aria-labelledby="catalog-heading">
                {!query && <div className="catalog-hero-art">
                    <img
                        src="https://image.tmdb.org/t/p/w780/uzERcfV2rSHNhW5eViQiO9hNiA7.jpg"
                        srcSet="https://image.tmdb.org/t/p/w500/uzERcfV2rSHNhW5eViQiO9hNiA7.jpg 500w, https://image.tmdb.org/t/p/w780/uzERcfV2rSHNhW5eViQiO9hNiA7.jpg 780w"
                        sizes="(max-width: 640px) 60vw, 55vw"
                        alt=""
                        width={780}
                        height={1170}
                    />
                </div>}
                <h1 id="catalog-heading" className="display-title">{query ? 'Buscar no catálogo' : <>Descubra filmes<br />e séries.</>}</h1>
                <form key={JSON.stringify([query, searchType, query ? minRating : undefined])} onSubmit={submitSearch} role="search" className="catalog-search">
                    <label className="catalog-search-field">
                        <span className="sr-only">Busca por título, série ou ator</span>
                        <Search size={19} aria-hidden="true" />
                        <input ref={searchInput} type="search" name="query" maxLength={100} placeholder="Título, série ou ator" defaultValue={query} />
                    </label>
                    <select className="catalog-field search-type" aria-label="Tipo da busca" name="type" defaultValue={searchType}>
                        <option value="all">Tudo</option><option value="movie">Filmes</option><option value="tv">Séries</option>
                    </select>
                    {query && <RatingFilter value={minRating} />}
                    <button className="accent-button" type="submit">Buscar</button>
                </form>
                {!query && <Link id="catalog-featured-duna" to="/movie/438631?type=movie" state={{ catalogLocation }} className="hero-credit" onClick={rememberCard}>
                    Duna · 2021 <ArrowRight size={14} aria-hidden="true" />
                </Link>}
                {query && searchType !== 'all' && <p className="search-hint">Para buscar por ator, selecione <strong>Tudo</strong>.</p>}
            </section>

            {query
                ? <Link to="/" className="text-action">Limpar busca</Link>
                : <div className="catalog-toolbar">
                    <div role="group" aria-label="Tipo para descobrir" className="catalog-tabs">
                        {discoveryTypes.map(({ value, label }) => <button key={value} type="button" aria-pressed={discoveryType === value} onClick={() => changeDiscoveryType(value)}>
                            {label}
                        </button>)}
                    </div>
                    <DiscoveryForm key={JSON.stringify([discoveryType, genres, year, minRating, sortBy])}
                        filters={{ type: discoveryType, genres, year, minRating, sortBy }} onSubmit={submitFilters} />
                </div>}

            {activeFilters.length > 0 && <div className="applied-filters" role="group" aria-label="Filtros aplicados">
                {activeFilters.map(({ key, label }) => <button key={key} className="filter-chip" type="button" aria-label={'Remover filtro ' + label} onClick={() => removeFilter(key)}>
                    {label} <X size={14} aria-hidden="true" />
                </button>)}
                {!query && (!data || tiles.length > 0) && <button type="button" className="text-action" onClick={clearFilters}>Limpar filtros</button>}
            </div>}

            <section className="catalog-results" aria-labelledby="catalog-title">
                <div className="results-heading">
                    <h2 ref={heading} tabIndex={-1} id="catalog-title" className="section-title">{headingText}</h2>
                    {data && totalPages > 1 && <span className="result-count">Página {page} de {totalPages}</span>}
                </div>
                {error && <div className="catalog-message">
                    <p role="alert">{error.message}</p>
                    <button type="button" onClick={retry} className="text-action">Tentar novamente</button>
                </div>}
                {!result && <>
                    <p role="status" className="sr-only">Carregando catálogo…</p>
                    <div aria-hidden="true" className="poster-grid">
                        {Array.from({ length: 6 }, (_, index) => <div key={index}><div className="title-poster" /><div className="poster-line" /></div>)}
                    </div>
                </>}
                {data && !tiles.length && <div className="catalog-message">
                    <p role="status">Nenhum título encontrado nesta página.</p>
                    {!query && activeFilters.length > 0 && <button type="button" className="text-action" onClick={clearFilters}>Limpar filtros</button>}
                    {query && searchType !== 'all' && <button type="button" className="text-action" onClick={() => removeFilter('type')}>Buscar em Tudo</button>}
                    {query && searchType === 'all' && <button type="button" className="text-action" onClick={() => searchInput.current?.focus()}>Editar busca</button>}
                </div>}
                {data && tiles.length > 0 && <div className="poster-grid">
                    {tiles.map(({ item, mediaType }, index) => {
                        const cardId = 'catalog-' + mediaType + '-' + item.id;
                        const title = item.title || item.name || 'Sem título';
                        const yearLabel = (item.release_date || item.first_air_date)?.slice(0, 4);
                        return <Link
                            key={cardId}
                            id={cardId}
                            className="poster-card"
                            to={'/movie/' + item.id + '?type=' + mediaType}
                            state={{ catalogLocation }}
                            onClick={rememberCard}
                        >
                            <Poster path={item.poster_path} priority={index < 6}>
                                {item.vote_average != null && <span className="poster-rating">
                                    <Star size={12} fill="currentColor" aria-hidden="true" />
                                    <span className="sr-only">Nota </span>{ratingFormat.format(item.vote_average)}
                                </span>}
                            </Poster>
                            <h3>{title}</h3>
                            <p className="title-meta">
                                {mediaType === 'tv' ? 'Série' : 'Filme'}{yearLabel && ' · ' + yearLabel}
                            </p>
                        </Link>;
                    })}
                </div>}
                {data && (totalPages > 1 || page > 1) && <nav aria-label="Paginação" className="catalog-pagination">
                    <button type="button" aria-label="Página anterior" disabled={page <= 1} onClick={() => changePage(Math.min(page - 1, totalPages))} className="quiet-button">
                        <ChevronLeft size={19} aria-hidden="true" /> Anterior
                    </button>
                    <span className="result-count">{page} / {totalPages}</span>
                    <button type="button" aria-label="Próxima página" disabled={page >= totalPages} onClick={() => changePage(page + 1)} className="quiet-button">
                        Próxima <ChevronRight size={19} aria-hidden="true" />
                    </button>
                </nav>}
            </section>
        </main>
    </>;
}
