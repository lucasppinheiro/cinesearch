import { useCallback, useEffect } from 'react';
import { CalendarDays, Clapperboard, Clock3, Play, Star, Users } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Poster from '../components/Poster';
import SiteHeader from '../components/SiteHeader';
import { ApiError, getMovieDetails } from '../services/movieApi';
import type { TmdbMovieDetails } from '../types/movie';
import { useRequest } from '../utils/useRequest';

const imageUrl = (path: string, size: string) => 'https://image.tmdb.org/t/p/' + size + path;
const numberFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function DetailContent({ movie, type, catalogLocation }: { movie: TmdbMovieDetails; type: string; catalogLocation: string }) {
    const title = movie.title || movie.name || 'Sem título';
    const year = (movie.release_date || movie.first_air_date)?.slice(0, 4);
    const isSeries = type === 'tv';
    const creator = isSeries ? movie.created_by?.map(person => person.name).join(', ') : movie.credits?.crew?.find(person => person.job === 'Director')?.name;
    const trailer = movie.videos?.results?.find(video => video.site === 'YouTube' && video.type === 'Trailer');
    const cast = movie.credits?.cast?.slice(0, 8) ?? [];
    const recommendations = movie.recommendations?.results?.slice(0, 6) ?? [];

    return <>
        <section className="detail-hero" aria-labelledby="detail-title">
            {movie.backdrop_path && <div className="detail-hero-art">
                <img
                    src={imageUrl(movie.backdrop_path, 'w780')}
                    srcSet={imageUrl(movie.backdrop_path, 'w780') + ' 780w, ' + imageUrl(movie.backdrop_path, 'w1280') + ' 1280w'}
                    sizes="100vw"
                    alt=""
                />
            </div>}
            <div className="site-width detail-intro">
                <div className="detail-poster"><Poster path={movie.poster_path} title={title} priority /></div>
                <div className="detail-title-block">
                    <p className="detail-type">{isSeries ? 'Série' : 'Filme'}{year && ' · ' + year}</p>
                    <h1 id="detail-title" className="display-title">{title}</h1>
                    <div className="detail-meta">
                        {movie.vote_average != null && <span className="detail-rating">
                            <Star size={15} fill="currentColor" aria-hidden="true" />
                            <span className="sr-only">Nota </span>{numberFormat.format(movie.vote_average)}
                        </span>}
                        {movie.runtime ? <span><Clock3 size={16} aria-hidden="true" />{movie.runtime} min</span> : null}
                        {movie.number_of_seasons ? <span>{movie.number_of_seasons} temporada{movie.number_of_seasons > 1 ? 's' : ''}</span> : null}
                    </div>
                    {!!movie.genres?.length && <p className="detail-genres">{movie.genres.map(genre => genre.name).join(' · ')}</p>}
                </div>
                <div className="detail-summary">
                    <p>{movie.overview || 'Nenhuma sinopse foi disponibilizada para este título.'}</p>
                    {trailer && <a className="accent-button mt-4" href={'https://www.youtube.com/watch?v=' + encodeURIComponent(trailer.key)} target="_blank" rel="noreferrer">
                        <Play size={16} fill="currentColor" aria-hidden="true" />Assistir trailer
                    </a>}
                </div>
            </div>
        </section>

        <div className="site-width detail-content">
            {cast.length > 0 && <section className="detail-cast">
                <h2 className="section-title" id="cast-title">Elenco principal</h2>
                <div tabIndex={0} role="region" aria-labelledby="cast-title" className="cast-scroll">
                    <ul>{cast.map(actor => <li key={actor.name + '-' + actor.character}>
                        <div className="cast-photo">
                            {actor.profile_path
                                ? <img src={imageUrl(actor.profile_path, 'w185')} width={72} height={72} alt="" loading="lazy" />
                                : <Users size={22} aria-hidden="true" />}
                        </div>
                        <p className="cast-name">{actor.name}</p>
                        {actor.character && <p className="cast-character">{actor.character}</p>}
                    </li>)}</ul>
                </div>
            </section>}

            <aside className="detail-facts">
                <h2 className="section-title">Ficha técnica</h2>
                <dl>
                    <div><dt>{isSeries ? 'Criação' : 'Direção'}</dt><dd>{creator || 'Não informado'}</dd></div>
                    <div><dt><CalendarDays size={14} aria-hidden="true" />Lançamento</dt><dd>{year || 'Não informado'}</dd></div>
                    {movie.budget ? <div><dt>Orçamento</dt><dd>US$ {numberFormat.format(movie.budget / 1_000_000)} mi</dd></div> : null}
                    {movie.revenue ? <div><dt>Bilheteria</dt><dd>US$ {numberFormat.format(movie.revenue / 1_000_000)} mi</dd></div> : null}
                </dl>
            </aside>

            {recommendations.length > 0 && <section className="detail-recommendations">
                <h2 className="section-title">Se você gostou deste</h2>
                <div className="poster-grid">
                    {recommendations.map(item => {
                        const mediaType = item.media_type === 'movie' || item.media_type === 'tv' ? item.media_type : type;
                        return <Link key={mediaType + ':' + item.id} to={'/movie/' + item.id + '?type=' + mediaType} state={{ catalogLocation }} className="poster-card">
                            <Poster path={item.poster_path} />
                            <h3>{item.title || item.name || 'Sem título'}</h3>
                        </Link>;
                    })}
                </div>
            </section>}
        </div>
    </>;
}

export default function MovieDetails() {
    const { id = '' } = useParams<{ id: string }>();
    const location = useLocation();
    const type = new URLSearchParams(location.search).get('type') || 'movie';
    const returnTo: unknown = location.state?.catalogLocation;
    const catalogLocation = typeof returnTo === 'string' && (returnTo === '/' || returnTo.startsWith('/?')) ? returnTo : '/';
    const load = useCallback((signal: AbortSignal) => getMovieDetails(id, type, signal), [id, type]);
    const { result, retry } = useRequest(load);

    useEffect(() => { window.scrollTo(0, 0); }, [id, type]);

    const movie = result?.data;
    const error = result?.error;
    const missing = !error || (error instanceof ApiError && error.status === 404);

    return <>
        <SiteHeader catalogLocation={catalogLocation} />
        <main>
            {!result ? <div className="site-width detail-loading">
                <p role="status">Carregando detalhes…</p>
            </div> : movie?.id && !error
                ? <DetailContent movie={movie} type={type} catalogLocation={catalogLocation} />
                : <div className="site-width detail-loading">
                    <div className="catalog-message">
                        <Clapperboard size={26} aria-hidden="true" />
                        <h1 className="section-title">{missing ? 'Não encontramos este título.' : 'Não foi possível carregar os detalhes.'}</h1>
                        <p role="alert">{error?.message || 'Ele pode não estar mais disponível no catálogo.'}</p>
                        {!missing && <button type="button" className="text-action" onClick={retry}>Tentar novamente</button>}
                    </div>
                </div>}
        </main>
    </>;
}
