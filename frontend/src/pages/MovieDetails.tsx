import React, { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Clapperboard, Clock3, Film, Play, Star, Users } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getMovieDetails } from '../services/movieApi';
import type { TmdbMovieDetails } from '../types/movie';

const imageUrl = (path: string | null | undefined, size = 'w500') => path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

const MovieDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const type = new URLSearchParams(useLocation().search).get('type') || 'movie';
    const [movie, setMovie] = useState<TmdbMovieDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        void getMovieDetails(id, type).then((data) => setMovie(data?.id ? data : null)).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Não foi possível carregar este título.')).finally(() => setLoading(false));
        window.scrollTo(0, 0);
    }, [id, type]);

    if (loading) return <div className="flex min-h-dvh items-center justify-center bg-[#0c0c0e] text-stone-400"><div className="w-56 space-y-3"><div className="h-4 w-20 rounded bg-[#24242a]" /><div className="h-9 rounded bg-[#24242a]" /><div className="h-4 rounded bg-[#24242a]" /></div></div>;
    if (error || !movie) return <div className="flex min-h-dvh items-center justify-center bg-[#0c0c0e] px-5 text-white"><div className="max-w-md rounded-2xl border border-white/10 bg-[#17171b] p-8 text-center"><Clapperboard className="mx-auto text-orange-400" size={32} /><h1 className="text-balance mt-4 text-2xl font-bold">Não encontramos este título.</h1><p className="text-pretty mt-3 text-stone-400">{error || 'Ele pode não estar mais disponível no catálogo.'}</p><button className="mt-6 rounded-lg bg-orange-500 px-5 py-3 font-bold text-zinc-950" onClick={() => navigate('/')}>Voltar ao catálogo</button></div></div>;

    const title = movie.title || movie.name || 'Sem título';
    const year = (movie.release_date || movie.first_air_date)?.slice(0, 4) || '—';
    const creator = type === 'tv' ? movie.created_by?.map((person) => person.name).join(', ') : movie.credits?.crew?.find((person) => person.job === 'Director')?.name;
    const backdrop = imageUrl(movie.backdrop_path, 'original') || imageUrl(movie.poster_path, 'original');
    const trailer = movie.videos?.results.find((video) => video.site === 'YouTube' && video.type === 'Trailer');
    const recommendations = movie.recommendations?.results?.slice(0, 6) ?? [];

    return <div className="min-h-dvh bg-[#0c0c0e] text-stone-100">
        <header className="border-b border-white/10 bg-[#101014]"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8"><button aria-label="Voltar" onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-semibold text-stone-300 hover:text-white"><ArrowLeft size={18} /> Voltar</button><button onClick={() => navigate('/')} className="flex items-center gap-2 font-bold text-white"><span className="flex size-8 items-center justify-center rounded-lg bg-orange-500 text-zinc-950"><Film size={18} /></span>CineSearch</button></div></header>
        <main>
            <section className="relative isolate overflow-hidden border-b border-white/10 bg-[#17171b]">
                {backdrop && <img src={backdrop} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20" />}
                <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-[220px_1fr] md:py-16">
                    <div className="mx-auto w-44 md:mx-0 md:w-full">{movie.poster_path ? <img src={imageUrl(movie.poster_path)!} alt={`Poster de ${title}`} className="aspect-[2/3] w-full rounded-xl object-cover shadow-2xl" /> : <div className="flex aspect-[2/3] items-center justify-center rounded-xl bg-[#24242a] text-stone-500"><Clapperboard size={35} /></div>}</div>
                    <div className="self-end"><p className="text-sm font-semibold text-orange-400">{type === 'tv' ? 'SÉRIE' : 'FILME'} · {year}</p><h1 className="text-balance mt-3 text-4xl font-bold leading-tight text-white sm:text-6xl">{title}</h1><div className="mt-5 flex flex-wrap gap-3 text-sm text-stone-300"><span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 tabular-nums"><Star size={15} className="fill-orange-400 text-orange-400" />{movie.vote_average?.toFixed(1) || '—'}</span>{movie.runtime ? <span className="inline-flex items-center gap-1"><Clock3 size={16} />{movie.runtime} min</span> : null}{movie.number_of_seasons ? <span>{movie.number_of_seasons} temporada{movie.number_of_seasons > 1 ? 's' : ''}</span> : null}<span>{movie.genres?.map((genre) => genre.name).join(' · ') || 'Gênero indisponível'}</span></div><p className="text-pretty mt-6 max-w-3xl text-base leading-7 text-stone-300">{movie.overview || 'Nenhuma sinopse foi disponibilizada para este título.'}</p>{trailer && <a className="mt-7 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-3 text-sm font-bold text-zinc-950 hover:bg-orange-400" href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noreferrer"><Play size={17} fill="currentColor" />Assistir trailer</a>}</div>
                </div>
            </section>
            <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
                <div className="grid gap-12 lg:grid-cols-[1fr_290px]"><div className="space-y-12"><section><h2 className="flex items-center gap-2 text-2xl font-bold text-white"><Users size={21} className="text-orange-400" />Elenco principal</h2><div className="mt-6 flex gap-4 overflow-x-auto pb-3">{(movie.credits?.cast ?? []).slice(0, 8).map((actor) => <div key={`${actor.name}-${actor.character}`} className="w-24 shrink-0"><div className="aspect-square overflow-hidden rounded-full bg-[#24242a]">{actor.profile_path ? <img src={imageUrl(actor.profile_path, 'w185')!} alt={actor.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-stone-500"><Users size={22} /></div>}</div><p className="mt-3 truncate text-sm font-semibold text-white">{actor.name}</p><p className="line-clamp-2 mt-1 text-xs text-stone-500">{actor.character || 'Elenco'}</p></div>)}</div></section>{recommendations.length > 0 && <section><h2 className="flex items-center gap-2 text-2xl font-bold text-white"><Clapperboard size={21} className="text-orange-400" />Se você gostou deste</h2><div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{recommendations.map((item) => <button type="button" key={item.id} onClick={() => navigate(`/movie/${item.id}?type=${type}`)} className="poster-card text-left"><div className="aspect-[2/3] overflow-hidden rounded-xl bg-[#202026]">{item.poster_path ? <img src={imageUrl(item.poster_path)!} alt={item.title || item.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-stone-500"><Clapperboard size={24} /></div>}</div><p className="mt-3 truncate text-sm font-semibold text-white">{item.title || item.name}</p></button>)}</div></section>}</div><aside className="h-fit rounded-xl border border-white/10 bg-[#17171b] p-6"><h2 className="text-lg font-bold text-white">Ficha técnica</h2><dl className="mt-5 space-y-5 text-sm"><div><dt className="text-stone-500">{type === 'tv' ? 'Criador' : 'Direção'}</dt><dd className="mt-1 font-semibold text-stone-200">{creator || 'Não informado'}</dd></div><div><dt className="flex items-center gap-1 text-stone-500"><CalendarDays size={14} />Lançamento</dt><dd className="mt-1 font-semibold text-stone-200">{year}</dd></div>{movie.budget ? <div><dt className="text-stone-500">Orçamento</dt><dd className="mt-1 font-semibold text-stone-200 tabular-nums">US$ {(movie.budget / 1_000_000).toFixed(1)} mi</dd></div> : null}{movie.revenue ? <div><dt className="text-stone-500">Bilheteria</dt><dd className="mt-1 font-semibold text-stone-200 tabular-nums">US$ {(movie.revenue / 1_000_000).toFixed(1)} mi</dd></div> : null}</dl></aside></div>
            </div>
        </main>
    </div>;
};
export default MovieDetails;
