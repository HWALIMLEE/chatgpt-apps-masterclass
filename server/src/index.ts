/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { createMcpHandler } from 'agents/mcp';
import z from 'zod';
import {
	fetchMovieByGenre,
	fetchMovieDetails,
	fetchMovieDiscover,
	fetchMovieGenres,
	fetchMovieReviews,
	fetchNowPlayingMovies,
	fetchSimilarMovies,
	fetchUpcomingMovies,
} from './fetcher';

const WIDGET_URI = 'ui://movies-widget';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const API_KEY = env.API_KEY;

		const server = new McpServer({
			name: 'Movies',
			version: '1.0.0',
		});

		registerAppResource(server, 'Movies Widget', WIDGET_URI, { description: 'Dev widget' }, async () => {
			const html = await env.ASSETS.fetch(new URL('http://your-sexy-worker.com/index.html'));

			return {
				contents: [
					{
						uri: WIDGET_URI,
						text: await html.text(),
						mimeType: RESOURCE_MIME_TYPE,
						_meta: {
							ui: {
								csp: {
									connectDomains: ['https://*.workers.dev'],
									resourceDomains: [
										'https://*.workers.dev',
										'https://fonts.googleapis.com',
										'https://fonts.gstatic.com',
										'https://image.tmdb.org',
									],
								},
							},
						},
					},
				],
			};
		});
		registerAppTool(
			server,
			'get-upcoming-movies',
			{
				title: 'Get Upcoming Movies',
				description: `Use this when the user want to see the movies that are going to be released soon or in the future.
				 Do not use this that are currently playing in the theaters or available for streaming.`,
				inputSchema: {},
				annotations: { readOnlyHint: true },
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Fetching upcoming movies...',
					'openai/toolInvocation/invoked': 'Done.',
				},
			},
			async () => {
				const movies = await fetchUpcomingMovies(API_KEY);
				return {
					content: [{ text: 'stuff', type: 'text' }],
					structuredContent: { movies },
				};
			},
		);

		registerAppTool(
			server,
			'get-now-playing-movies',
			{
				title: 'Get Now Playing Movies',
				description: `Use this when the user want to see the movies that are playing right now.
				 Do not use this for streaming movies or to check the availability of upcoming release. 
				 Do not use this to find a specific movie.`,
				inputSchema: {},
				annotations: { readOnlyHint: true },
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Fetching now playing movies...',
					'openai/toolInvocation/invoked': 'Done.',
				},
			},
			async () => {
				const movies = await fetchNowPlayingMovies(API_KEY);
				return {
					content: [{ text: 'stuff', type: 'text' }],
					structuredContent: { movies },
				};
			},
		);

		registerAppTool(
			server,
			'get-similar-movies',
			{
				title: 'Get Similar Movies',
				description: `Use this when the user wants to find similar movies to a specific movie.
				Require a movie ID from a previous list. Do not use before identifying a specific movie.`,
				inputSchema: {
					movieId: z.number().positive().describe(`Thie ID of the movie to find similar movies for.
						 Obtained by calling other tools first like 'get-upcoming-movies' or 'get-now-playing-movies'`),
				},
				annotations: { readOnlyHint: true },
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Fetching similar movies...',
					'openai/toolInvocation/invoked': 'Done.',
				},
			},
			async ({ movieId }) => {
				const movies = await fetchSimilarMovies(movieId, API_KEY);
				return {
					content: [{ text: 'stuff', type: 'text' }],
					structuredContent: { movies },
				};
			},
		);

		// ui 가 없을 수도 있음. 모든 툴이 ui 를 가져야 하는 건 아님
		registerAppTool(
			server,
			'get-movie-reviews',
			{
				title: 'Get Movie Reviews',
				description: `Use this when the user wants to find reviews about a specific movie.
				 Requires a movie ID from a previous list. Do not use before identifying a specific movie.`,
				inputSchema: {
					movieId: z.number().positive().describe(`Thie ID of the movie to find similar movies for.
						 Obtained by calling other tools first like 'get-upcoming-movies' or 'get-now-playing-movies'`),
				},
				annotations: { readOnlyHint: true },
				_meta: {
					'openai/toolInvocation/invoking': 'Fetching reviews',
					'openai/toolInvocation/invoked': 'Done.',
				},
			},
			async ({ movieId }) => {
				const reviews = await fetchMovieReviews(movieId, API_KEY);
				return {
					content: [{ text: JSON.stringify(reviews), type: 'text' }],
				};
			},
		);

		registerAppTool(
			server,
			'get-movie-genres',
			{
				title: 'Get Movie Genres',
				description: `Use this to get the list of genres ID. This should be used before calling the 'get-movies-by-genre' tool
				Do not use this to search for movies directly.`,
				inputSchema: {},
				annotations: { readOnlyHint: true },
				_meta: {
					'openai/toolInvocation/invoking': 'Fetching genres...',
					'openai/toolInvocation/invoked': 'Done.',
				},
			},
			async () => {
				const genres = await fetchMovieGenres(API_KEY);
				return {
					content: [{ text: JSON.stringify(genres), type: 'text' }],
				};
			},
		);

		registerAppTool(
			server,
			'get-movies-by-genre',
			{
				title: 'Get Movies by Genre',
				description: `Use this when the user wants to find movies by a specific genre.
				Use 'get-movie-genres' first to get the list of genres IDs first`,
				inputSchema: {
					genreId: z.number().positive().describe(`The ID of the genre to find movies for.
						 Obtained by calling 'get-movie-genres'
						(example: 28 for Action, 99 for documentary)`),
				},
				annotations: { readOnlyHint: true },
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Fetching movies...',
					'openai/toolInvocation/invoked': 'Done.',
				},
			},
			async ({ genreId }) => {
				const movies = await fetchMovieByGenre(genreId, API_KEY);
				return {
					content: [{ text: 'stuff', type: 'text' }],
					structuredContent: { movies },
				};
			},
		);

		registerAppTool(
			server,
			'get-movie-details',
			{
				title: 'Get Movie Details',
				description: `Use this when the user wants to see more details about a specific movie.
				Details like synopsis, cast, ans production companies are available here.
				Requires a movie ID from a previous list. Do not use this tool before identifying the movie.`,
				inputSchema: {
					movieId: z.number().positive().describe(`The ID of the movie to find details for.
						Obtained by any of the list movie tools`),
				},
				annotations: { readOnlyHint: true },
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Fetching movie details...',
					'openai/toolInvocation/invoked': 'Done.',
				},
			},
			async ({ movieId }) => {
				const movie = await fetchMovieDetails(movieId, API_KEY);
				return {
					content: [{ text: 'stuff', type: 'text' }],
					structuredContent: { movie },
				};
			},
		);

		registerAppTool(
			server,
			'get-movie-discover',
			{
				title: 'Discover Movies',
				description: `Use this when the user wants to find movies with flexible filters such as genre, release date, rating, language, region, runtime, and watch providers.
				Use this when the built-in movie list tools are not specific enough.`,
				inputSchema: {
					certification: z.string().optional(),
					'certification.gte': z.string().optional(),
					'certification.lte': z.string().optional(),
					certification_country: z.string().optional(),
					include_adult: z.boolean().optional(),
					include_video: z.boolean().optional(),
					language: z.string().optional(),
					page: z.number().int().positive().optional(),
					primary_release_year: z.number().int().optional(),
					'primary_release_date.gte': z.string().optional(),
					'primary_release_date.lte': z.string().optional(),
					region: z.string().optional(),
					'release_date.gte': z.string().optional(),
					'release_date.lte': z.string().optional(),
					sort_by: z
						.enum([
							'original_title.asc',
							'original_title.desc',
							'popularity.asc',
							'popularity.desc',
							'revenue.asc',
							'revenue.desc',
							'primary_release_date.asc',
							'primary_release_date.desc',
							'title.asc',
							'title.desc',
							'vote_average.asc',
							'vote_average.desc',
							'vote_count.asc',
							'vote_count.desc',
						])
						.optional(),
					'vote_average.gte': z.number().optional(),
					'vote_average.lte': z.number().optional(),
					'vote_count.gte': z.number().optional(),
					'vote_count.lte': z.number().optional(),
					watch_region: z.string().optional(),
					with_cast: z.string().optional(),
					with_companies: z.string().optional(),
					with_crew: z.string().optional(),
					with_genres: z.string().optional(),
					with_keywords: z.string().optional(),
					with_origin_country: z.string().optional(),
					with_original_language: z.string().optional(),
					with_people: z.string().optional(),
					with_release_type: z.string().optional(),
					'with_runtime.gte': z.number().int().optional(),
					'with_runtime.lte': z.number().int().optional(),
					with_watch_monetization_types: z.string().optional(),
					with_watch_providers: z.string().optional(),
					without_companies: z.string().optional(),
					without_genres: z.string().optional(),
					without_keywords: z.string().optional(),
					without_watch_providers: z.string().optional(),
					year: z.number().int().optional(),
				},
				annotations: { readOnlyHint: true },
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
					'openai/toolInvocation/invoking': 'Discovering movies...',
					'openai/toolInvocation/invoked': 'Done.',
				},
			},
			async (params) => {
				const movies = await fetchMovieDiscover(API_KEY, params);
				return {
					content: [{ text: 'stuff', type: 'text' }],
					structuredContent: { movies },
				};
			},
		);



		// @ts-ignore
		const handler = createMcpHandler(server);
		return handler(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
