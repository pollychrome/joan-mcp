/**
 * Resource registration for Joan MCP server
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { JoanApiClient } from '../client/api-client.js';
import { registerProjectResources } from './projects.js';
import { registerTaskResources } from './tasks.js';
import { registerMilestoneResources } from './milestones.js';
import { registerGoalResources } from './goals.js';
import { registerNoteResources } from './notes.js';

/**
 * Register all resources with the MCP server
 */
export function registerAllResources(server: McpServer, client: JoanApiClient): void {
  registerProjectResources(server, client);
  registerTaskResources(server, client);
  registerMilestoneResources(server, client);
  registerGoalResources(server, client);
  registerNoteResources(server, client);
}

export {
  registerProjectResources,
  registerTaskResources,
  registerMilestoneResources,
  registerGoalResources,
  registerNoteResources,
};
