/**
 * MCP resources for attachment data
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { JoanApiClient } from '../client/api-client.js';
import type { AttachmentEntityType } from '../client/types.js';

export function registerAttachmentResources(server: McpServer, client: JoanApiClient): void {
  // Project attachments
  server.resource(
    'joan://projects/{projectId}/attachments',
    'Get file attachments for a project',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/projects\/([^/]+)\/attachments$/);
      const projectId = match?.[1];

      if (!projectId) {
        throw new Error('Invalid project attachments URI');
      }

      const attachments = await client.listAttachmentsByEntity('project', projectId);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(attachments, null, 2),
        }],
      };
    }
  );

  // Project attachment hierarchy
  server.resource(
    'joan://projects/{projectId}/attachments/hierarchy',
    'Get all attachments organized by project hierarchy (project → milestones → tasks)',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/projects\/([^/]+)\/attachments\/hierarchy$/);
      const projectId = match?.[1];

      if (!projectId) {
        throw new Error('Invalid project attachments hierarchy URI');
      }

      const hierarchy = await client.getProjectAttachmentHierarchy(projectId);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(hierarchy, null, 2),
        }],
      };
    }
  );

  // Milestone attachments
  server.resource(
    'joan://projects/{projectId}/milestones/{milestoneId}/attachments',
    'Get file attachments for a milestone',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/projects\/([^/]+)\/milestones\/([^/]+)\/attachments$/);
      const milestoneId = match?.[2];

      if (!milestoneId) {
        throw new Error('Invalid milestone attachments URI');
      }

      const attachments = await client.listAttachmentsByEntity('milestone', milestoneId);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(attachments, null, 2),
        }],
      };
    }
  );

  // Task attachments
  server.resource(
    'joan://tasks/{taskId}/attachments',
    'Get file attachments for a task',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/tasks\/([^/]+)\/attachments$/);
      const taskId = match?.[1];

      if (!taskId) {
        throw new Error('Invalid task attachments URI');
      }

      const attachments = await client.listAttachmentsByEntity('task', taskId);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(attachments, null, 2),
        }],
      };
    }
  );

  // Note attachments
  server.resource(
    'joan://notes/{noteId}/attachments',
    'Get file attachments for a note',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/notes\/([^/]+)\/attachments$/);
      const noteId = match?.[1];

      if (!noteId) {
        throw new Error('Invalid note attachments URI');
      }

      const attachments = await client.listAttachmentsByEntity('note', noteId);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(attachments, null, 2),
        }],
      };
    }
  );

  // Single attachment metadata
  server.resource(
    'joan://attachments/{attachmentId}',
    'Get metadata for a specific attachment',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/attachments\/([^/]+)$/);
      const attachmentId = match?.[1];

      if (!attachmentId) {
        throw new Error('Invalid attachment URI');
      }

      const attachment = await client.getAttachmentMetadata(attachmentId);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(attachment, null, 2),
        }],
      };
    }
  );

  // Storage usage
  server.resource(
    'joan://attachments/usage',
    'Get storage usage statistics for the current user',
    async (uri) => {
      const usage = await client.getStorageUsage();

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(usage, null, 2),
        }],
      };
    }
  );

  // Task resources (links/notes)
  server.resource(
    'joan://tasks/{taskId}/resources',
    'Get resources (links, notes, references) attached to a task',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/tasks\/([^/]+)\/resources$/);
      const taskId = match?.[1];

      if (!taskId) {
        throw new Error('Invalid task resources URI');
      }

      const resources = await client.listTaskResources(taskId);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(resources, null, 2),
        }],
      };
    }
  );

  // Project resources (links/notes)
  server.resource(
    'joan://projects/{projectId}/resources',
    'Get resources (links, notes) attached to a project',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/projects\/([^/]+)\/resources$/);
      const projectId = match?.[1];

      if (!projectId) {
        throw new Error('Invalid project resources URI');
      }

      const resources = await client.listProjectResources(projectId);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(resources, null, 2),
        }],
      };
    }
  );
}
