/**
 * MCP resources for milestone data
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { JoanApiClient } from '../client/api-client.js';

export function registerMilestoneResources(server: McpServer, client: JoanApiClient): void {
  // Milestone details resource template (requires project context)
  server.resource(
    'joan://projects/{projectId}/milestones/{milestoneId}',
    'Get detailed information about a specific milestone including linked tasks',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/projects\/([^/]+)\/milestones\/([^/]+)$/);
      const projectId = match?.[1];
      const milestoneId = match?.[2];

      if (!projectId || !milestoneId) {
        throw new Error('Invalid milestone URI');
      }

      const milestone = await client.getMilestone(projectId, milestoneId);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(milestone, null, 2),
        }],
      };
    }
  );

  // Milestone resources
  server.resource(
    'joan://projects/{projectId}/milestones/{milestoneId}/resources',
    'Get resources (links and notes) attached to a milestone',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/projects\/([^/]+)\/milestones\/([^/]+)\/resources$/);
      const projectId = match?.[1];
      const milestoneId = match?.[2];

      if (!projectId || !milestoneId) {
        throw new Error('Invalid milestone resources URI');
      }

      const resources = await client.getMilestoneResources(projectId, milestoneId);

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
