/**
 * MCP tools for milestone management
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { JoanApiClient } from '../client/api-client.js';
import { formatErrorForMcp } from '../utils/errors.js';

export function registerMilestoneTools(server: McpServer, client: JoanApiClient): void {
  // Create Milestone
  server.tool(
    'create_milestone',
    'Create a new milestone in a Joan project.',
    {
      project_id: z.string().uuid().describe('Project ID to create milestone in'),
      name: z.string().min(1).describe('Milestone name'),
      description: z.string().optional().describe('Milestone description'),
      target_date: z.string().optional().describe('Target completion date (ISO 8601 format)'),
      status: z.enum(['upcoming', 'in_progress', 'completed', 'missed']).optional().describe('Milestone status'),
    },
    async (input) => {
      try {
        const milestone = await client.createMilestone(input.project_id, {
          name: input.name,
          description: input.description,
          target_date: input.target_date,
          status: input.status,
        });

        return {
          content: [{
            type: 'text',
            text: `Created milestone "${milestone.name}" (ID: ${milestone.id}) in project ${input.project_id}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Update Milestone
  server.tool(
    'update_milestone',
    'Update an existing milestone in a Joan project.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      milestone_id: z.string().uuid().describe('Milestone ID to update'),
      name: z.string().min(1).optional().describe('New milestone name'),
      description: z.string().optional().describe('New milestone description'),
      target_date: z.string().optional().describe('New target date (ISO 8601 format)'),
      status: z.enum(['upcoming', 'in_progress', 'completed', 'missed']).optional().describe('New milestone status'),
      progress: z.number().int().min(0).max(100).optional().describe('Progress percentage (0-100)'),
    },
    async (input) => {
      try {
        const milestone = await client.updateMilestone(input.project_id, input.milestone_id, {
          name: input.name,
          description: input.description,
          target_date: input.target_date,
          status: input.status,
          progress: input.progress,
        });

        return {
          content: [{
            type: 'text',
            text: `Updated milestone "${milestone.name}" (ID: ${milestone.id})`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Delete Milestone
  server.tool(
    'delete_milestone',
    'Delete a milestone from a Joan project.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      milestone_id: z.string().uuid().describe('Milestone ID to delete'),
    },
    async (input) => {
      try {
        await client.deleteMilestone(input.project_id, input.milestone_id);

        return {
          content: [{
            type: 'text',
            text: `Milestone ${input.milestone_id} deleted from project ${input.project_id}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Link Tasks to Milestone
  server.tool(
    'link_tasks_to_milestone',
    'Link one or more tasks to a milestone.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      milestone_id: z.string().uuid().describe('Milestone ID'),
      task_ids: z.array(z.string().uuid()).min(1).describe('Array of task IDs to link'),
    },
    async (input) => {
      try {
        await client.linkTasksToMilestone(input.project_id, input.milestone_id, input.task_ids);

        return {
          content: [{
            type: 'text',
            text: `Linked ${input.task_ids.length} task(s) to milestone ${input.milestone_id}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Unlink Task from Milestone
  server.tool(
    'unlink_task_from_milestone',
    'Remove a task from a milestone.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      milestone_id: z.string().uuid().describe('Milestone ID'),
      task_id: z.string().uuid().describe('Task ID to unlink'),
    },
    async (input) => {
      try {
        await client.unlinkTaskFromMilestone(input.project_id, input.milestone_id, input.task_id);

        return {
          content: [{
            type: 'text',
            text: `Unlinked task ${input.task_id} from milestone ${input.milestone_id}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );
}
