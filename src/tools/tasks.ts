/**
 * MCP tools for task management
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { JoanApiClient } from '../client/api-client.js';
import { formatErrorForMcp } from '../utils/errors.js';
import { formatTask, formatTaskInput } from '../utils/converters.js';

export function registerTaskTools(server: McpServer, client: JoanApiClient): void {
  // Create Task
  server.tool(
    'create_task',
    'Create a new task in Joan. Can be associated with a project or standalone.',
    {
      title: z.string().min(1).describe('Task title'),
      description: z.string().optional().describe('Task description'),
      project_id: z.string().uuid().optional().describe('Project ID to create task in'),
      column_id: z.string().uuid().optional().describe('Kanban column ID (for project tasks)'),
      priority: z.enum(['none', 'low', 'medium', 'high']).optional().describe('Task priority'),
      due_date: z.string().optional().describe('Due date (ISO 8601 format, e.g., 2025-12-31)'),
      estimated_pomodoros: z.number().int().min(1).optional().describe('Estimated pomodoros (25 min each)'),
      assignee_id: z.string().uuid().optional().describe('Assignee user ID'),
      tags: z.array(z.string()).optional().describe('Task tags'),
    },
    async (input) => {
      try {
        const apiInput = formatTaskInput({
          title: input.title,
          description: input.description,
          project_id: input.project_id,
          column_id: input.column_id,
          priority: input.priority,
          due_date: input.due_date,
          estimated_pomodoros: input.estimated_pomodoros,
          tags: input.tags,
        });

        if (input.assignee_id) {
          apiInput.assignee_id = input.assignee_id;
        }

        const task = await client.createTask(apiInput);
        const formatted = formatTask(task);

        return {
          content: [{
            type: 'text',
            text: `Created task "${task.title}" (ID: ${task.id})${task.task_number ? ` #${task.task_number}` : ''}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Update Task
  server.tool(
    'update_task',
    'Update an existing task in Joan.',
    {
      task_id: z.string().uuid().describe('Task ID to update'),
      title: z.string().min(1).optional().describe('New task title'),
      description: z.string().optional().describe('New task description'),
      column_id: z.string().uuid().optional().describe('Move to column ID'),
      status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional().describe('New task status'),
      priority: z.enum(['none', 'low', 'medium', 'high']).optional().describe('New priority'),
      due_date: z.string().optional().describe('New due date (ISO 8601 format)'),
      estimated_pomodoros: z.number().int().min(1).optional().describe('New estimated pomodoros'),
      assignee_id: z.string().uuid().optional().describe('New assignee user ID'),
      tags: z.array(z.string()).optional().describe('New task tags'),
    },
    async (input) => {
      try {
        const apiInput = formatTaskInput({
          title: input.title || '',
          description: input.description,
          status: input.status,
          priority: input.priority,
          due_date: input.due_date,
          estimated_pomodoros: input.estimated_pomodoros,
          column_id: input.column_id,
          tags: input.tags,
        });

        // Remove title if not provided
        if (!input.title) {
          delete (apiInput as unknown as Record<string, unknown>).title;
        }

        if (input.assignee_id) {
          apiInput.assignee_id = input.assignee_id;
        }

        const task = await client.updateTask(input.task_id, apiInput);

        return {
          content: [{
            type: 'text',
            text: `Updated task "${task.title}" (ID: ${task.id})`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Complete Task
  server.tool(
    'complete_task',
    'Mark a task as completed.',
    {
      task_id: z.string().uuid().describe('Task ID to complete'),
    },
    async (input) => {
      try {
        await client.completeTask(input.task_id);

        return {
          content: [{
            type: 'text',
            text: `Task ${input.task_id} marked as completed`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Delete Task
  server.tool(
    'delete_task',
    'Delete a task.',
    {
      task_id: z.string().uuid().describe('Task ID to delete'),
    },
    async (input) => {
      try {
        await client.deleteTask(input.task_id);

        return {
          content: [{
            type: 'text',
            text: `Task ${input.task_id} deleted`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );
}
