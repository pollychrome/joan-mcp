/**
 * MCP resources for goal data
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { JoanApiClient } from '../client/api-client.js';

export function registerGoalResources(server: McpServer, client: JoanApiClient): void {
  // List all goals
  server.resource(
    'joan://goals',
    'List all goals',
    async () => {
      const goals = await client.listGoals({ include_tasks: true });

      return {
        contents: [{
          uri: 'joan://goals',
          mimeType: 'application/json',
          text: JSON.stringify(goals, null, 2),
        }],
      };
    }
  );

  // Goal details resource template
  server.resource(
    'joan://goals/{goalId}',
    'Get detailed information about a specific goal including linked tasks',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/goals\/([^/]+)$/);
      const goalId = match?.[1];

      if (!goalId) {
        throw new Error('Invalid goal URI');
      }

      const goal = await client.getGoal(goalId);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(goal, null, 2),
        }],
      };
    }
  );

  // Goal stats resource template
  server.resource(
    'joan://goals/{goalId}/stats',
    'Get statistics for a specific goal',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/goals\/([^/]+)\/stats$/);
      const goalId = match?.[1];

      if (!goalId) {
        throw new Error('Invalid goal stats URI');
      }

      const stats = await client.getGoalStats(goalId);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(stats, null, 2),
        }],
      };
    }
  );
}
