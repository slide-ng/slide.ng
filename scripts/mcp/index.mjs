// `slide-ng mcp [slides.md]`: an MCP server on stdio. A tool client (an editor, a chat app) can read the outline, get and edit
// slides of the deck. Nothing else is read or written: the tools only touch the deck's markdown files.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { parseFlags } from '../cli/flags.mjs';
import { TOOLS } from './tools.mjs';

// Read when a server is made: the dev server's unit tests bundle this file, and a bundled test has no package.json next to it.
function version() {
  try {
    return JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;
  } catch {
    return '0.0.0';
  }
}

/**
 * The server, with the tools of one deck. Tests connect it to a pipe instead of stdio. The dev server adds its own tools
 * and what they need (`context`: the sync hub and the address, see scripts/dev/mcp-http.mjs).
 */
export function createMcpServer(entry, { tools = TOOLS, context = {} } = {}) {
  const ctx = { entry, root: dirname(entry), ...context };
  const server = new McpServer({ name: 'slide-ng', version: version() });
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.schema },
      async (args) => {
        try {
          const result = await tool.run(ctx, args);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
          // A failed tool is reported to the client, not thrown: the server keeps running.
          return { isError: true, content: [{ type: 'text', text: error.message }] };
        }
      },
    );
  }
  return server;
}

export async function mcpCommand(argv) {
  const { positionals } = parseFlags(argv, {});
  const entry = resolve(positionals[0] ?? 'slides.md');
  await createMcpServer(entry).connect(new StdioServerTransport());
  // stdout carries the protocol, so the message goes to stderr.
  console.error(`slide-ng mcp: serving ${entry}`);
}
