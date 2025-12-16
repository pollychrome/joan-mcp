/**
 * MCP resources for note data
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { JoanApiClient } from '../client/api-client.js';

export function registerNoteResources(server: McpServer, client: JoanApiClient): void {
  // List all notes
  server.resource(
    'joan://notes',
    'List all notes',
    async () => {
      const notes = await client.listNotes();

      return {
        contents: [{
          uri: 'joan://notes',
          mimeType: 'application/json',
          text: JSON.stringify(notes, null, 2),
        }],
      };
    }
  );

  // Note details resource template
  server.resource(
    'joan://notes/{noteId}',
    'Get detailed information about a specific note',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/notes\/([^/]+)$/);
      const noteId = match?.[1];

      if (!noteId) {
        throw new Error('Invalid note URI');
      }

      const note = await client.getNote(noteId);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(note, null, 2),
        }],
      };
    }
  );
}
