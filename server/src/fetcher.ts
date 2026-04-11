type QueryValue = string | number | boolean | undefined;

type SortBy =
	| 'original_title.asc'
	| 'original_title.desc'
	| 'popularity.asc'
	| 'popularity.desc'
	| 'revenue.asc'
	| 'revenue.desc'
	| 'primary_release_date.asc'
	| 'primary_release_date.desc'
	| 'title.asc'
	| 'title.desc'
	| 'vote_average.asc'
	| 'vote_average.desc'
	| 'vote_count.asc'
	| 'vote_count.desc';

type WatchMonetizationType = 'flatrate' | 'free' | 'ads' | 'rent' | 'buy';

interface MovieDiscoverParams {
	certification?: string;
	'certification.gte'?: string;
	'certification.lte'?: string;
	certification_country?: string;
	include_adult?: boolean;
	include_video?: boolean;
	language?: string;
	page?: number;
	primary_release_year?: number;
	'primary_release_date.gte'?: string;
	'primary_release_date.lte'?: string;
	region?: string;
	'release_date.gte'?: string;
	'release_date.lte'?: string;
	sort_by?: SortBy;
	'vote_average.gte'?: number;
	'vote_average.lte'?: number;
	'vote_count.gte'?: number;
	'vote_count.lte'?: number;
	watch_region?: string;
	with_cast?: string;
	with_companies?: string;
	with_crew?: string;
	with_genres?: string;
	with_keywords?: string;
	with_origin_country?: string;
	with_original_language?: string;
	with_people?: string;
	with_release_type?: string;
	'with_runtime.gte'?: number;
	'with_runtime.lte'?: number;
	with_watch_monetization_types?: WatchMonetizationType | string;
	with_watch_providers?: string;
	without_companies?: string;
	without_genres?: string;
	without_keywords?: string;
	without_watch_providers?: string;
	year?: number;
}

function toSearchParams<T extends object>(params: T): Record<string, string> {
	return Object.fromEntries(
		Object.entries(params as Record<string, QueryValue>)
			.filter(([, value]) => value !== undefined)
			.map(([key, value]) => [key, String(value)]),
	);
}

async function fetchFromTMDB<T extends object>(endpoint: string, apiKey: string, params: T = {} as T) {
	const searchParams = new URLSearchParams({
		page: '1',
		include_adult: 'false',
		language: 'en',
		...toSearchParams(params),
	});

	const url = `https://api.themoviedb.org/3${endpoint}?${searchParams}`;

	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	});

	if (!response.ok) {
		throw new Error(`Could not fetch from API: ${response.status} ${response.statusText}`);
	}
	return response.json();
}

export async function fetchUpcomingMovies(apiKey: string) {
	return fetchFromTMDB(`/movie/upcoming`, apiKey);
}
export async function fetchNowPlayingMovies(apiKey: string) {
	return fetchFromTMDB(`/movie/now_playing`, apiKey);
}
export async function fetchSimilarMovies(movieId: number, apiKey: string) {
	return fetchFromTMDB(`/movie/${movieId}/similar`, apiKey);
}
export async function fetchMovieReviews(movieId: number, apiKey: string) {
	return fetchFromTMDB(`/movie/${movieId}/reviews`, apiKey);
}
export async function fetchMovieGenres(apiKey: string) {
	return fetchFromTMDB(`/genre/movie/list`, apiKey);
}
export async function fetchMovieByGenre(genreId: number, apiKey: string) {
	return fetchFromTMDB(`/discover/movie`, apiKey, {
		with_genres: String(genreId),
		sort_by: 'popularity.desc',
	});
}
export async function fetchMovieDetails(movieId: number, apiKey: string) {
	return fetchFromTMDB(`/movie/${movieId}`, apiKey);
}

export async function fetchMovieDiscover(apiKey: string, params: MovieDiscoverParams = {}) {
	return fetchFromTMDB(`/discover/movie`, apiKey, params);
}
