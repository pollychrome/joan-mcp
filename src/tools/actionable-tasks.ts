/**
 * MCP tool for fetching pre-computed actionable task queues
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { JoanApiClient } from '../client/api-client.js';
import { formatErrorForMcp } from '../utils/errors.js';
import { ensureAuthenticated } from '../index.js';

export function registerActionableTasksTools(server: McpServer, client: JoanApiClient): void {
  server.tool(
    'get_actionable_tasks',
    'Get pre-computed priority queues of actionable tasks for a project. Returns queues (ba, architect, dev, reviewer, ops), pipeline status, recovery diagnostics, and summary. Used by coordinator dispatch for instant cold-start.',
    {
      project_id: z.string().uuid().describe('Project ID to get actionable tasks for'),
      mode: z.enum(['standard', 'yolo']).optional().describe('Workflow mode (default: project setting)'),
      include_payloads: z.boolean().optional().describe('Include smart payloads per task (default: true)'),
      include_recovery: z.boolean().optional().describe('Include recovery diagnostics (default: true)'),
      stale_claim_minutes: z.number().int().min(1).optional().describe('Minutes before a claim is considered stale (default: 120)'),
      stuck_state_minutes: z.number().int().min(1).optional().describe('Minutes before a state is considered stuck (default: 120)'),
    },
    async (input) => {
      try {
        await ensureAuthenticated(client);
        const result = await client.getActionableTasks(input.project_id, {
          mode: input.mode,
          include_payloads: input.include_payloads,
          include_recovery: input.include_recovery,
          stale_claim_minutes: input.stale_claim_minutes,
          stuck_state_minutes: input.stuck_state_minutes,
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );
}
