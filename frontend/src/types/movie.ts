export interface TmdbMovieResult {
    id: number;
    title?: string;
    name?: string;
    release_date?: string;
    first_air_date?: string;
    poster_path: string | null;
    media_type?: string;
}

export interface TmdbSearchResponse {
    page: number;
    results: TmdbMovieResult[];
    total_results: number;
}

export interface TmdbGenre {
    id: number;
    name: string;
}

export interface TmdbCastMember {
    name: string;
    character?: string;
    profile_path?: string | null;
}

export interface TmdbCrewMember {
    name: string;
    job: string;
}

export interface TmdbCredits {
    cast: TmdbCastMember[];
    crew: TmdbCrewMember[];
}

export interface TmdbMovieDetails {
    id: number;
    title?: string;
    name?: string;
    overview: string;
    release_date?: string;
    first_air_date?: string;
    runtime: number | null;
    vote_average: number;
    genres: TmdbGenre[];
    credits: TmdbCredits;
    poster_path?: string | null;
    backdrop_path?: string | null;
    created_by?: TmdbCreatedBy[];
    number_of_seasons?: number | null;
    status?: string;
    budget?: number;
    revenue?: number;
}

export interface TmdbCreatedBy {
    name: string;
}
