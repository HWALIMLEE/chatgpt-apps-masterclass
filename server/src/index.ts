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

const WIDGET_URI = 'ui://flashcards-widget';

const cardSchema = z.object({
	front: z.string().describe('The question or prompt'),
								back: z.string().describe('The answer'),
								hint: z.string().describe('A hint for the card'),
								status: z.enum(['new', 'learning', 'mastered']).readonly().default('new'),
});

const deckSchema = z.object({
	title: z.string().describe("The title of the deck. e.g 'React Fundamentals'"),
					description: z.string().describe('Brief description of what this deck covers.'),
					cards: z
						.array(
							cardSchema
						)
						.min(10)
						.max(20)
						.describe('Arrary of flashcards (aim for 20)'),
});

type Deck = z.infer<typeof deckSchema>;
type Card = z.infer<typeof cardSchema>;

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const server = new McpServer({
			name: 'Flashcard Server',
			version: '1.0.0',
		});

		registerAppResource(server, 'Flashcard Widget', WIDGET_URI, { description: 'Dev widget' }, async () => {
			const html = await env.ASSETS.fetch(new URL('http://hello/index.html'));

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

		// create deck
		registerAppTool(
			server,
			'create-deck',
			{
				title: 'Create Deck',
				description: `Use this to create a deck of flashcards for studying. Generate 20 cards, with front (question)
			and back (answer) with a hint as well. Ask the user for their username before using this tool`,
				inputSchema: {
					username: z.string().describe("The user's username. Ask for this before using the tool"),
					deck: deckSchema
				},
				annotations: {
					readOnlyHint: false,
				},
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
				},
			},
			async ({ deck: {title, description, cards}, username }) => {
				const cardsWithIds = cards.map((card, index) => ({
					id: `card-${Date.now()}-${index}`,
					...card,
					status: 'new',
				}));
				const deck = {
					id: `deck-${Date.now()}`,
					title,
					description,
					cards: cardsWithIds,
					createdAt: new Date().toISOString(),
				};
				const decksKey = `user:${username}:decks`;

				await env.FLASHCARDS_KV.put(`user:${username}:deck:${deck.id}`, JSON.stringify(deck));
				const existingIds = await env.FLASHCARDS_KV.get<string[]>(decksKey, 'json');
				const deckIds = existingIds || [];

				deckIds.push(deck.id);

				await env.FLASHCARDS_KV.put(decksKey, JSON.stringify(deckIds));

				return {
					content: [
						{
							type: 'text',
							text: `Created a ${title} deck with ${cards.length} flashcards`,
						},
					],
					structuredContent: { deck, username },
				};
			},
		);

		// list decks
		registerAppTool(
			server,
			'list-decks',
			{
				title: 'List Decks',
				description: `Use this to show the user a list of their decks. Ask the user for their username before using this tool if you dont know it.`,
				inputSchema: {
					username: z.string().describe("The user's username. Ask for this before using the tool"),
				},
				annotations: {
					readOnlyHint: true,
				},
				_meta: {
					ui: {
						resourceUri: WIDGET_URI,
					},
				},
			},
			async ({ username }) => {
				
				const decksKey = `user:${username}:decks`;

				const deckIds = await env.FLASHCARDS_KV.get<string[]>(decksKey, 'json');

				if (!deckIds || deckIds.length === 0) {
					return {
						content: [{ text: 'You have no decks', type: 'text'}],
						structuredContent: { decks: []}
					}
				}

				const decks = [];

				for (const deckId of deckIds) {
					const deck = await env.FLASHCARDS_KV.get<Deck>(`user:${username}:deck:${deckId}`, 'json');
					if (deck) {
						const masteredCount = deck.cards.filter((card) => card.status === 'mastered').length;
						decks.push({masteredCount, ...deck});
					}
				}
				return {
					content: [
						{
							type: 'text',
							text: `Found a total of ${decks.length} ${JSON.stringify(decks)}`
						}
					],
					structuredContent: {decks, username}
				}
			},
		);

		// open deck

		// mark card (private)

		// reset deck (private)

		// delete deck

		// @ts-ignore
		const handler = createMcpHandler(server);
		return handler(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
