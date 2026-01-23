/**
 * MCP tools for milestone management
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { JoanApiClient } from '../client/api-client.js';
import { formatErrorForMcp } from '../utils/errors.js';
import { ensureAuthenticated } from '../index.js';

export function registerMilestoneTools(server: McpServer, client: JoanApiClient): void {
  // List Milestones (Read)
  server.tool(
    'list_milestones',
    'List all milestones for a project in Joan. Returns milestone IDs, names, status, target dates, and progress.',
    {
      project_id: z.string().uuid().describe('Project ID to list milestones for'),
      status: z.enum(['upcoming', 'in_progress', 'completed', 'missed']).optional().describe('Filter by milestone status'),
      include_tasks: z.boolean().optional().describe('Include linked tasks in response'),
    },
    async (input) => {
      try {
        await ensureAuthenticated(client);
        const milestones = await client.listMilestones(input.project_id, {
          status: input.status,
          include_tasks: input.include_tasks,
        });

        if (milestones.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No milestones found for project ${input.project_id}.`,
            }],
          };
        }

        const milestoneList = milestones.map(m => {
          let info = `- ${m.name} (ID: ${m.id})`;
          if (m.status) info += ` [${m.status}]`;
          if (m.target_date) info += ` - Target: ${m.target_date}`;
          if (m.progress !== undefined) info += ` - Progress: ${m.progress}%`;
          if (m.description) info += `\n  ${m.description}`;
          return info;
        }).join('\n');

        return {
          content: [{
            type: 'text',
            text: `Found ${milestones.length} milestone(s):\n\n${milestoneList}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Get Milestone Details (Read)
  server.tool(
    'get_milestone',
    'Get detailed information about a specific milestone including linked tasks.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      milestone_id: z.string().uuid().describe('Milestone ID to retrieve'),
    },
    async (input) => {
      try {
        await ensureAuthenticated(client);
        const milestone = await client.getMilestone(input.project_id, input.milestone_id);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(milestone, null, 2),
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

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
        await ensureAuthenticated(client);
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
        await ensureAuthenticated(client);
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
        await ensureAuthenticated(client);
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
        await ensureAuthenticated(client);
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
        await ensureAuthenticated(client);
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
