/**
 * MCP tools for note management
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { JoanApiClient } from '../client/api-client.js';
import { formatErrorForMcp } from '../utils/errors.js';

export function registerNoteTools(server: McpServer, client: JoanApiClient): void {
  // Create Note
  server.tool(
    'create_note',
    'Create a new note in Joan.',
    {
      title: z.string().min(1).describe('Note title'),
      content: z.string().optional().describe('Note content (markdown supported)'),
      folder_id: z.string().uuid().optional().describe('Folder ID to place note in'),
      tags: z.array(z.string()).optional().describe('Note tags'),
      is_pinned: z.boolean().optional().describe('Pin the note'),
    },
    async (input) => {
      try {
        const note = await client.createNote({
          title: input.title,
          content: input.content,
          folder_id: input.folder_id,
          tags: input.tags,
          is_pinned: input.is_pinned,
        });

        return {
          content: [{
            type: 'text',
            text: `Created note "${note.title}" (ID: ${note.id})`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Update Note
  server.tool(
    'update_note',
    'Update an existing note in Joan.',
    {
      note_id: z.string().uuid().describe('Note ID to update'),
      title: z.string().min(1).optional().describe('New note title'),
      content: z.string().optional().describe('New note content (markdown supported)'),
      folder_id: z.string().uuid().optional().describe('Move to folder ID'),
      tags: z.array(z.string()).optional().describe('New note tags'),
      is_pinned: z.boolean().optional().describe('Pin/unpin the note'),
      is_archived: z.boolean().optional().describe('Archive/unarchive the note'),
    },
    async (input) => {
      try {
        const note = await client.updateNote(input.note_id, {
          title: input.title,
          content: input.content,
          folder_id: input.folder_id,
          tags: input.tags,
          is_pinned: input.is_pinned,
          is_archived: input.is_archived,
        });

        return {
          content: [{
            type: 'text',
            text: `Updated note "${note.title}" (ID: ${note.id})`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Delete Note
  server.tool(
    'delete_note',
    'Delete a note from Joan.',
    {
      note_id: z.string().uuid().describe('Note ID to delete'),
    },
    async (input) => {
      try {
        await client.deleteNote(input.note_id);

        return {
          content: [{
            type: 'text',
            text: `Note ${input.note_id} deleted`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );
}
