/**
 * MCP resources for task data
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { JoanApiClient } from '../client/api-client.js';
import { formatTask } from '../utils/converters.js';

export function registerTaskResources(server: McpServer, client: JoanApiClient): void {
  // List all tasks
  server.resource(
    'joan://tasks',
    'List all tasks across all projects',
    async () => {
      const tasks = await client.listTasks();
      const formattedTasks = tasks.map(t => formatTask(t));

      return {
        contents: [{
          uri: 'joan://tasks',
          mimeType: 'application/json',
          text: JSON.stringify(formattedTasks, null, 2),
        }],
      };
    }
  );

  // Task details resource template
  server.resource(
    'joan://tasks/{taskId}',
    'Get detailed information about a specific task',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/tasks\/([^/]+)$/);
      const taskId = match?.[1];

      if (!taskId) {
        throw new Error('Invalid task URI');
      }

      const task = await client.getTaskWithSubtasks(taskId);
      const formattedTask = formatTask(task);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(formattedTask, null, 2),
        }],
      };
    }
  );
}
