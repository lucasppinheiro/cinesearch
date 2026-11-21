import { useCallback, useEffect } from 'react';
import { ArrowLeft, CalendarDays, Clapperboard, Clock3, Film, Play, Star, Users } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ApiError, getMovieDetails } from '../services/movieApi';
import { useRequest } from '../utils/useRequest';

const imageUrl = (path: string, size = 'w500') => 'https://image.tmdb.org/t/p/' + size + path;

export default function MovieDetails() {
    const { id = '' } = useParams<{ id: string }>();
    const location = useLocation();
    const type = new URLSearchParams(location.search).get('type') || 'movie';
    const returnTo: unknown = location.state?.catalogLocation;
    const catalogLocation = typeof returnTo === 'string' && (returnTo === '/' || returnTo.startsWith('/?')) ? returnTo : '/';
    const load = useCallback((signal: AbortSignal) => getMovieDetails(id, type, signal), [id, type]);
    const { result, retry } = useRequest(load);

    useEffect(() => { window.scrollTo(0, 0); }, [id, type]);

    if (!result) return <main className="flex min-h-[65vh] items-center justify-center text-stone-400">
        <p role="status" className="sr-only">Carregando detalhes…</p>
        <div className="w-56 space-y-3" aria-hidden="true">
            <div className="h-4 w-20 rounded bg-[#24242a]" /><div className="h-9 rounded bg-[#24242a]" /><div className="h-4 rounded bg-[#24242a]" />
        </div>
    </main>;

    const { data: movie, error } = result;
    if (!movie?.id || error) {
        const missing = !error || (error instanceof ApiError && error.status === 404);
        return <main className="flex min-h-[65vh] items-center justify-center px-5 text-white">
            <div className="max-w-md rounded-2xl border border-white/10 bg-[#17171b] p-8 text-center">
                <Clapperboard className="mx-auto text-orange-400" size={32} aria-hidden="true" />
                <h1 className="text-balance mt-4 text-2xl font-bold">{missing ? 'Não encontramos este título.' : 'Não foi possível carregar os detalhes.'}</h1>
                <p role="alert" className="text-pretty mt-3 text-stone-400">{error?.message || 'Ele pode não estar mais disponível no catálogo.'}</p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                    {!missing && <button type="button" className="rounded-lg bg-orange-500 px-5 py-3 font-bold text-zinc-950" onClick={retry}>Tentar novamente</button>}
                    <Link className="font-semibold text-orange-400 underline underline-offset-4" to={catalogLocation}>Voltar ao catálogo</Link>
                </div>
            </div>
        </main>;
    }

    const title = movie.title || movie.name || 'Sem título';
    const year = (movie.release_date || movie.first_air_date)?.slice(0, 4) || '—';
    const isSeries = type === 'tv';
    const creator = isSeries ? movie.created_by?.map(person => person.name).join(', ') : movie.credits?.crew?.find(person => person.job === 'Director')?.name;
    const backdrop = movie.backdrop_path;
    const trailer = movie.videos?.results?.find(video => video.site === 'YouTube' && video.type === 'Trailer');
    const recommendations = movie.recommendations?.results?.slice(0, 6) ?? [];

    return <div className="text-stone-100">
        <header className="border-b border-white/10 bg-[#101014]">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
                <Link to={catalogLocation} className="flex items-center gap-2 text-sm font-semibold text-stone-300 hover:text-white"><ArrowLeft size={18} aria-hidden="true" /> Voltar ao catálogo</Link>
                <Link to="/" className="flex items-center gap-2 font-bold text-white">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-orange-500 text-zinc-950"><Film size={18} aria-hidden="true" /></span>CineSearch
                </Link>
            </div>
        </header>
        <main>
            <section className="relative isolate overflow-hidden border-b border-white/10 bg-[#17171b]">
                {backdrop && <img src={imageUrl(backdrop, 'w780')} srcSet={imageUrl(backdrop, 'w780') + ' 780w, ' + imageUrl(backdrop, 'w1280') + ' 1280w'} sizes="100vw" alt="" fetchPriority="low" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20" />}
                <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-[220px_1fr] md:py-16">
                    <div className="mx-auto w-44 md:mx-0 md:w-full">
                        {movie.poster_path
                            ? <img src={imageUrl(movie.poster_path, 'w342')} alt={'Pôster de ' + title} fetchPriority="high" className="aspect-[2/3] w-full rounded-xl object-cover shadow-2xl" />
                            : <div className="flex aspect-[2/3] items-center justify-center rounded-xl bg-[#24242a] text-stone-400"><Clapperboard size={35} aria-hidden="true" /></div>}
                    </div>
                    <div className="self-end">
                        <p className="text-sm font-semibold text-orange-400">{isSeries ? 'SÉRIE' : 'FILME'} · {year}</p>
                        <h1 className="text-balance mt-3 text-4xl font-bold leading-tight text-white sm:text-6xl">{title}</h1>
                        <div className="mt-5 flex flex-wrap gap-3 text-sm text-stone-300">
                            <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 tabular-nums"><Star size={15} className="fill-orange-400 text-orange-400" aria-hidden="true" />{movie.vote_average?.toFixed(1) || '—'}</span>
                            {movie.runtime ? <span className="inline-flex items-center gap-1"><Clock3 size={16} aria-hidden="true" />{movie.runtime} min</span> : null}
                            {movie.number_of_seasons ? <span>{movie.number_of_seasons} temporada{movie.number_of_seasons > 1 ? 's' : ''}</span> : null}
                            <span>{movie.genres?.map(genre => genre.name).join(' · ') || 'Gênero indisponível'}</span>
                        </div>
                        <p className="text-pretty mt-6 max-w-3xl text-base leading-7 text-stone-300">{movie.overview || 'Nenhuma sinopse foi disponibilizada para este título.'}</p>
                        {trailer && <a className="mt-7 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-3 text-sm font-bold text-zinc-950 hover:bg-orange-400" href={'https://www.youtube.com/watch?v=' + encodeURIComponent(trailer.key)} target="_blank" rel="noreferrer"><Play size={17} fill="currentColor" aria-hidden="true" />Assistir trailer</a>}
                    </div>
                </div>
            </section>
            <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
                <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_290px]">
                    <div className="min-w-0 space-y-12">
                        <section>
                            <h2 className="flex items-center gap-2 text-2xl font-bold text-white"><Users size={21} className="text-orange-400" aria-hidden="true" />Elenco principal</h2>
                            <div className="mt-6 flex gap-4 overflow-x-auto pb-3">
                                {(movie.credits?.cast ?? []).slice(0, 8).map(actor => <div key={actor.name + '-' + actor.character} className="w-24 shrink-0">
                                    <div className="aspect-square overflow-hidden rounded-full bg-[#24242a]">
                                        {actor.profile_path
                                            ? <img src={imageUrl(actor.profile_path, 'w185')} alt="" loading="lazy" className="h-full w-full object-cover" />
                                            : <div className="flex h-full items-center justify-center text-stone-400"><Users size={22} aria-hidden="true" /></div>}
                                    </div>
                                    <p className="mt-3 truncate text-sm font-semibold text-white">{actor.name}</p>
                                    <p className="line-clamp-2 mt-1 text-xs text-stone-400">{actor.character || 'Elenco'}</p>
                                </div>)}
                            </div>
                        </section>
                        {recommendations.length > 0 && <section>
                            <h2 className="flex items-center gap-2 text-2xl font-bold text-white"><Clapperboard size={21} className="text-orange-400" aria-hidden="true" />Se você gostou deste</h2>
                            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                {recommendations.map(item => {
                                    const mediaType = item.media_type === 'movie' || item.media_type === 'tv' ? item.media_type : type;
                                    return <Link key={mediaType + ':' + item.id} to={'/movie/' + item.id + '?type=' + mediaType} state={{ catalogLocation }} className="poster-card min-w-0 text-left">
                                        <div className="aspect-[2/3] overflow-hidden rounded-xl bg-[#202026]">
                                            {item.poster_path
                                                ? <img src={imageUrl(item.poster_path, 'w342')} alt="" loading="lazy" className="h-full w-full object-cover" />
                                                : <div className="flex h-full items-center justify-center text-stone-400"><Clapperboard size={24} aria-hidden="true" /></div>}
                                        </div>
                                        <p className="mt-3 truncate text-sm font-semibold text-white">{item.title || item.name || 'Sem título'}</p>
                                    </Link>;
                                })}
                            </div>
                        </section>}
                    </div>
                    <aside className="h-fit rounded-xl border border-white/10 bg-[#17171b] p-6">
                        <h2 className="text-lg font-bold text-white">Ficha técnica</h2>
                        <dl className="mt-5 space-y-5 text-sm">
                            <div><dt className="text-stone-400">{isSeries ? 'Criador' : 'Direção'}</dt><dd className="mt-1 font-semibold text-stone-200">{creator || 'Não informado'}</dd></div>
                            <div><dt className="flex items-center gap-1 text-stone-400"><CalendarDays size={14} aria-hidden="true" />Lançamento</dt><dd className="mt-1 font-semibold text-stone-200">{year}</dd></div>
                            {movie.budget ? <div><dt className="text-stone-400">Orçamento</dt><dd className="mt-1 font-semibold text-stone-200 tabular-nums">US$ {(movie.budget / 1_000_000).toFixed(1)} mi</dd></div> : null}
                            {movie.revenue ? <div><dt className="text-stone-400">Bilheteria</dt><dd className="mt-1 font-semibold text-stone-200 tabular-nums">US$ {(movie.revenue / 1_000_000).toFixed(1)} mi</dd></div> : null}
                        </dl>
                    </aside>
                </div>
            </div>
        </main>
    </div>;
}
