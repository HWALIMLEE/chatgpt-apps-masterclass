import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createMcpHandler } from 'agents/mcp';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { register } from 'node:module';

const widgetHtml = /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
  </style>
</head>

<body>
  <div class="card" id="price-card">
    <p class="loading">Loading stock price…</p>
  </div>

  <script type="module">
	import {App} from "https://esm.sh/@modelcontextprotocol/ext-apps/app-with-deps";

	const app = new App({
		name: "Stocks Widget",
		description: "Get the price of a stock given a ticker symbol",
		version: "1.0"})

	app.ontoolresult = ({structuredContent}) => {
		if (!structuredContent) return;
		document.getElementById("price-card").innerHTML = structuredContent.price;
	}
	app.connect();
  </script>
</body>
</html>`;

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const server = new McpServer({
			name: 'Stocks Server',
			version: '1.0',
		});

		registerAppResource(
			server,
			'Stocks Widget',
			'ui://stocks-ui',
			{ description: 'Get the price of a stock given a ticker symbol' },
			async () => {
				return {
					contents: [
						{
							uri: 'ui://stocks-ui',
							text: widgetHtml,
							mimeType: RESOURCE_MIME_TYPE,
						},
					],
				};
			},
		);

		registerAppTool(
			server,
			'get-stock-price',
			{
				description: 'Get the price of a stock given a ticker symbol',
				inputSchema: {
					symbol: z.string(),
				},
				_meta: {
					ui: {
						resourceUri: 'ui://stocks-ui',
					},
					'openai/toolInvocation/invoking': 'Getting Stocks...',
					'openai/toolInvocation/invoked': 'Search Complete',
				},
				annotations: {
					openWorldHint: true,
					readOnlyHint: true,
				},
			},

			async ({ symbol }) => {
				return {
					content: [
						{
							type: 'text',
							text: `The price of ${symbol} is $10 USD.`,
						},
					],

					structuredContent: {
						price: 10,
					},
				};
			},
		);

		// @ts-ignore
		const handler = createMcpHandler(server);

		return handler(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
