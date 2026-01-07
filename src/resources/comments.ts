/**
 * MCP resources for comment data
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { JoanApiClient } from '../client/api-client.js';

export function registerCommentResources(server: McpServer, client: JoanApiClient): void {
  // Task comments resource
  server.resource(
    'joan://tasks/{taskId}/comments',
    'Get all comments for a specific task',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/tasks\/([^/]+)\/comments$/);
      const taskId = match?.[1];

      if (!taskId) {
        throw new Error('Invalid task comments URI');
      }

      const comments = await client.listTaskComments(taskId);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(comments, null, 2),
        }],
      };
    }
  );

  // Milestone comments resource
  server.resource(
    'joan://projects/{projectId}/milestones/{milestoneId}/comments',
    'Get all comments for a specific milestone',
    async (uri) => {
      const match = uri.pathname.match(
        /^\/\/projects\/([^/]+)\/milestones\/([^/]+)\/comments$/
      );
      const projectId = match?.[1];
      const milestoneId = match?.[2];

      if (!projectId || !milestoneId) {
        throw new Error('Invalid milestone comments URI');
      }

      const comments = await client.listMilestoneComments(projectId, milestoneId);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(comments, null, 2),
        }],
      };
    }
  );
}
