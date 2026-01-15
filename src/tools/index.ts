/**
 * Tool registration for Joan MCP server
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { JoanApiClient } from '../client/api-client.js';
import { registerTaskTools } from './tasks.js';
import { registerProjectTools } from './projects.js';
import { registerMilestoneTools } from './milestones.js';
import { registerGoalTools } from './goals.js';
import { registerNoteTools } from './notes.js';
import { registerCommentTools } from './comments.js';
import { registerAttachmentTools } from './attachments.js';
import { registerResourceTools } from './resources.js';
import { registerProjectTagTools } from './project-tags.js';

/**
 * Register all tools with the MCP server
 */
export function registerAllTools(server: McpServer, client: JoanApiClient): void {
  registerTaskTools(server, client);
  registerProjectTools(server, client);
  registerMilestoneTools(server, client);
  registerGoalTools(server, client);
  registerNoteTools(server, client);
  registerCommentTools(server, client);
  registerAttachmentTools(server, client);
  registerResourceTools(server, client);
  registerProjectTagTools(server, client);
}

export {
  registerTaskTools,
  registerProjectTools,
  registerMilestoneTools,
  registerGoalTools,
  registerNoteTools,
  registerCommentTools,
  registerAttachmentTools,
  registerResourceTools,
  registerProjectTagTools,
};
