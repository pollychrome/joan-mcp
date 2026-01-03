/**
 * MCP tools for task management
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { JoanApiClient } from '../client/api-client.js';
import { formatErrorForMcp } from '../utils/errors.js';
import { formatTask, formatTaskInput, statusToBackend } from '../utils/converters.js';
import { inferColumnFromStatus } from '../utils/column-mapper.js';

export function registerTaskTools(server: McpServer, client: JoanApiClient): void {
  // List Tasks (Read)
  server.tool(
    'list_tasks',
    'List tasks in Joan. Can filter by project or list all tasks across projects.',
    {
      project_id: z.string().uuid().optional().describe('Filter by project ID'),
      status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional().describe('Filter by task status'),
      limit: z.number().int().min(1).max(100).optional().describe('Maximum number of tasks to return (default: 50)'),
    },
    async (input) => {
      try {
        let tasks;
        if (input.project_id) {
          tasks = await client.getProjectTasks(input.project_id, {
            status: input.status,
            limit: input.limit,
          });
        } else {
          tasks = await client.listTasks({
            status: input.status,
            limit: input.limit,
          });
        }

        if (tasks.length === 0) {
          return {
            content: [{
              type: 'text',
              text: input.project_id
                ? `No tasks found for project ${input.project_id}.`
                : 'No tasks found.',
            }],
          };
        }

        const priorityLabels = ['none', 'low', 'medium', 'high'];
        const taskList = tasks.map(t => {
          let info = `- ${t.title} (ID: ${t.id})`;
          if (t.task_number) info = `- #${t.task_number} ${t.title} (ID: ${t.id})`;
          if (t.status) info += ` [${t.status}]`;
          if (t.priority && t.priority > 0) info += ` (${priorityLabels[t.priority] || t.priority})`;
          if (t.due_date) info += ` - Due: ${t.due_date}`;
          return info;
        }).join('\n');

        return {
          content: [{
            type: 'text',
            text: `Found ${tasks.length} task(s):\n\n${taskList}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Get Task Details (Read)
  server.tool(
    'get_task',
    'Get detailed information about a specific task including subtasks.',
    {
      task_id: z.string().uuid().describe('Task ID to retrieve'),
    },
    async (input) => {
      try {
        const task = await client.getTaskWithSubtasks(input.task_id);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(task, null, 2),
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Create Task
  server.tool(
    'create_task',
    'Create a new task in Joan. Can be associated with a project or standalone. When status is provided with a project, the task is automatically placed in the matching Kanban column.',
    {
      title: z.string().min(1).describe('Task title'),
      description: z.string().optional().describe('Task description'),
      project_id: z.string().uuid().optional().describe('Project ID to create task in'),
      column_id: z.string().uuid().optional().describe('Kanban column ID (overrides status-based inference)'),
      status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional().describe('Initial task status'),
      priority: z.enum(['none', 'low', 'medium', 'high']).optional().describe('Task priority'),
      due_date: z.string().optional().describe('Due date (ISO 8601 format, e.g., 2025-12-31)'),
      estimated_pomodoros: z.number().int().min(1).optional().describe('Estimated pomodoros (25 min each)'),
      assignee_id: z.string().uuid().optional().describe('Assignee user ID'),
      tags: z.array(z.string()).optional().describe('Task tags'),
      sync_column: z.boolean().optional().default(true).describe('Auto-place in column based on status (default: true)'),
    },
    async (input) => {
      try {
        let inferredColumnId: string | undefined;

        // Infer column from status when creating in a project
        if (input.project_id && input.status && !input.column_id && input.sync_column !== false) {
          try {
            const columns = await client.getProjectColumns(input.project_id);
            const targetColumn = inferColumnFromStatus(columns, input.status);
            if (targetColumn) {
              inferredColumnId = targetColumn.id;
            }
          } catch {
            // Column inference failed - proceed without it
          }
        }

        const apiInput = formatTaskInput({
          title: input.title,
          description: input.description,
          project_id: input.project_id,
          column_id: input.column_id || inferredColumnId,
          status: input.status,
          priority: input.priority,
          due_date: input.due_date,
          estimated_pomodoros: input.estimated_pomodoros,
          tags: input.tags,
        });

        if (input.assignee_id) {
          apiInput.assignee_id = input.assignee_id;
        }

        const task = await client.createTask(apiInput);

        let message = `Created task "${task.title}" (ID: ${task.id})`;
        if (task.task_number) message += ` #${task.task_number}`;
        if (inferredColumnId) message += ' in matching column';

        return {
          content: [{
            type: 'text',
            text: message,
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
    'Update an existing task in Joan. When status changes, the task is automatically moved to the matching Kanban column unless sync_column is false or an explicit column_id is provided.',
    {
      task_id: z.string().uuid().describe('Task ID to update'),
      title: z.string().min(1).optional().describe('New task title'),
      description: z.string().optional().describe('New task description'),
      column_id: z.string().uuid().optional().describe('Move to column ID (overrides auto-sync)'),
      status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional().describe('New task status'),
      priority: z.enum(['none', 'low', 'medium', 'high']).optional().describe('New priority'),
      due_date: z.string().optional().describe('New due date (ISO 8601 format)'),
      estimated_pomodoros: z.number().int().min(1).optional().describe('New estimated pomodoros'),
      assignee_id: z.string().uuid().optional().describe('New assignee user ID'),
      tags: z.array(z.string()).optional().describe('New task tags'),
      sync_column: z.boolean().optional().default(true).describe('Auto-sync column when status changes (default: true)'),
    },
    async (input) => {
      try {
        let inferredColumnId: string | undefined;

        // Auto-sync column when status changes (unless explicit column_id provided or sync disabled)
        if (input.status && !input.column_id && input.sync_column !== false) {
          try {
            // Get task to find its project
            const task = await client.getTask(input.task_id);

            if (task.project_id) {
              // Get project columns
              const columns = await client.getProjectColumns(task.project_id);

              // Infer column from new status
              const targetColumn = inferColumnFromStatus(columns, input.status);

              if (targetColumn && targetColumn.id !== task.column_id) {
                inferredColumnId = targetColumn.id;
              }
            }
          } catch {
            // Column inference failed - proceed without it
          }
        }

        const apiInput = formatTaskInput({
          title: input.title || '',
          description: input.description,
          status: input.status,
          priority: input.priority,
          due_date: input.due_date,
          estimated_pomodoros: input.estimated_pomodoros,
          column_id: input.column_id || inferredColumnId,
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

        const message = inferredColumnId
          ? `Updated task "${task.title}" (ID: ${task.id}) and moved to matching column`
          : `Updated task "${task.title}" (ID: ${task.id})`;

        return {
          content: [{
            type: 'text',
            text: message,
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
    'Mark a task as completed and optionally move it to the Done column.',
    {
      task_id: z.string().uuid().describe('Task ID to complete'),
      sync_column: z.boolean().optional().default(true).describe('Move task to Done column (default: true)'),
    },
    async (input) => {
      try {
        // First, complete the task (updates status)
        await client.completeTask(input.task_id);

        let columnSynced = false;

        // If sync_column is enabled, also move to Done column
        if (input.sync_column !== false) {
          try {
            // Get task to find its project
            const task = await client.getTask(input.task_id);

            if (task.project_id) {
              // Get project columns
              const columns = await client.getProjectColumns(task.project_id);

              // Find the Done column
              const doneColumn = inferColumnFromStatus(columns, 'done');

              if (doneColumn && doneColumn.id !== task.column_id) {
                // Move task to Done column
                await client.updateTask(input.task_id, { column_id: doneColumn.id });
                columnSynced = true;
              }
            }
          } catch {
            // Column sync failed but task was completed - don't throw
          }
        }

        const message = columnSynced
          ? `Task ${input.task_id} marked as completed and moved to Done column`
          : `Task ${input.task_id} marked as completed`;

        return {
          content: [{
            type: 'text',
            text: message,
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

  // Bulk Update Tasks
  server.tool(
    'bulk_update_tasks',
    'Update multiple tasks at once. Efficient for batch operations like moving many tasks to a column or changing their status. Uses a single API transaction.',
    {
      updates: z.array(z.object({
        task_id: z.string().uuid().describe('Task ID to update'),
        column_id: z.string().uuid().optional().describe('Column ID to move task to'),
        status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional().describe('New status'),
      })).min(1).max(100).describe('Array of task updates (max 100)'),
    },
    async (input) => {
      try {
        // Convert to backend format
        const updates = input.updates.map(update => ({
          id: update.task_id,
          column_id: update.column_id,
          status: update.status ? statusToBackend(update.status) : undefined,
          order_index: 0, // Required by API but we just use 0 for bulk status/column updates
        }));

        const result = await client.bulkUpdateTasks(updates);

        return {
          content: [{
            type: 'text',
            text: `Successfully updated ${result.updated} task(s)`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );
}
