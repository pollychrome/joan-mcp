/**
 * MCP tools for goal management
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { JoanApiClient } from '../client/api-client.js';
import { formatErrorForMcp } from '../utils/errors.js';

export function registerGoalTools(server: McpServer, client: JoanApiClient): void {
  // Create Goal
  server.tool(
    'create_goal',
    'Create a new goal in Joan.',
    {
      title: z.string().min(1).describe('Goal title'),
      description: z.string().optional().describe('Goal description'),
      type: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'standard']).optional().describe('Goal type'),
      target_date: z.string().optional().describe('Target date (ISO 8601 format)'),
    },
    async (input) => {
      try {
        const goal = await client.createGoal({
          title: input.title,
          description: input.description,
          type: input.type,
          target_date: input.target_date,
        });

        return {
          content: [{
            type: 'text',
            text: `Created goal "${goal.title}" (ID: ${goal.id})`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Update Goal
  server.tool(
    'update_goal',
    'Update an existing goal in Joan.',
    {
      goal_id: z.string().uuid().describe('Goal ID to update'),
      title: z.string().min(1).optional().describe('New goal title'),
      description: z.string().optional().describe('New goal description'),
      status: z.enum(['active', 'paused', 'completed', 'archived']).optional().describe('New goal status'),
      target_date: z.string().optional().describe('New target date (ISO 8601 format)'),
      progress: z.number().int().min(0).max(100).optional().describe('Progress percentage (0-100)'),
    },
    async (input) => {
      try {
        const goal = await client.updateGoal(input.goal_id, {
          title: input.title,
          description: input.description,
          status: input.status,
          target_date: input.target_date,
          progress: input.progress,
        });

        return {
          content: [{
            type: 'text',
            text: `Updated goal "${goal.title}" (ID: ${goal.id})`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Delete Goal
  server.tool(
    'delete_goal',
    'Delete a goal from Joan.',
    {
      goal_id: z.string().uuid().describe('Goal ID to delete'),
    },
    async (input) => {
      try {
        await client.deleteGoal(input.goal_id);

        return {
          content: [{
            type: 'text',
            text: `Goal ${input.goal_id} deleted`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Link Task to Goal
  server.tool(
    'link_task_to_goal',
    'Link a task to a goal to track progress.',
    {
      goal_id: z.string().uuid().describe('Goal ID'),
      task_id: z.string().uuid().describe('Task ID to link'),
    },
    async (input) => {
      try {
        await client.linkTaskToGoal(input.goal_id, input.task_id);

        return {
          content: [{
            type: 'text',
            text: `Linked task ${input.task_id} to goal ${input.goal_id}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Unlink Task from Goal
  server.tool(
    'unlink_task_from_goal',
    'Remove a task from a goal.',
    {
      goal_id: z.string().uuid().describe('Goal ID'),
      task_id: z.string().uuid().describe('Task ID to unlink'),
    },
    async (input) => {
      try {
        await client.unlinkTaskFromGoal(input.goal_id, input.task_id);

        return {
          content: [{
            type: 'text',
            text: `Unlinked task ${input.task_id} from goal ${input.goal_id}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );
}
