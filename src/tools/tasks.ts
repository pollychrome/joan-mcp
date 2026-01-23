/**
 * MCP tools for task management
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { JoanApiClient } from '../client/api-client.js';
import { formatErrorForMcp } from '../utils/errors.js';
import { formatTask, formatTaskInput, statusToBackend } from '../utils/converters.js';
import { inferColumnFromStatus, inferStatusFromColumn } from '../utils/column-mapper.js';
import { ensureAuthenticated } from '../index.js';
import { logger } from '../utils/logger.js';

export function registerTaskTools(server: McpServer, client: JoanApiClient): void {
  // List Tasks (Read)
  server.tool(
    'list_tasks',
    'List tasks in Joan. Can filter by project or list all tasks across projects.',
    {
      project_id: z.string().uuid().optional().describe('Filter by project ID'),
      status: z.string().optional().describe('Filter by task status (supports custom statuses per project)'),
      limit: z.number().int().min(1).max(100).optional().describe('Maximum number of tasks to return (default: 50)'),
    },
    async (input) => {
      try {
        await ensureAuthenticated(client);

        // Convert status filter from frontend format to backend format for API query
        const backendStatus = input.status ? statusToBackend(input.status) : undefined;

        let tasks;
        if (input.project_id) {
          tasks = await client.getProjectTasks(input.project_id, {
            status: backendStatus,
            limit: input.limit,
          });
        } else {
          tasks = await client.listTasks({
            status: backendStatus,
            limit: input.limit,
          });
        }

        // Convert tasks to frontend format for display
        const formattedTasks = tasks.map(t => formatTask(t));

        if (formattedTasks.length === 0) {
          return {
            content: [{
              type: 'text',
              text: input.project_id
                ? `No tasks found for project ${input.project_id}.`
                : 'No tasks found.',
            }],
          };
        }

        const taskList = formattedTasks.map(t => {
          let info = `- ${t.title} (ID: ${t.id})`;
          if (t.task_number) info = `- #${t.task_number} ${t.title} (ID: ${t.id})`;
          if (t.status) info += ` [${t.status}]`;
          if (t.priority && t.priority !== 'none') info += ` (${t.priority})`;
          if (t.due_date) info += ` - Due: ${t.due_date}`;
          return info;
        }).join('\n');

        return {
          content: [{
            type: 'text',
            text: `Found ${formattedTasks.length} task(s):\n\n${taskList}`,
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
        await ensureAuthenticated(client);
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
    'Create a new task in Joan. Can be associated with a project or standalone. When status is provided with a project, the task is automatically placed in the matching Kanban column. When column_id is provided without status, the task status is automatically set to match the column\'s default status.',
    {
      title: z.string().min(1).describe('Task title'),
      description: z.string().optional().describe('Task description'),
      project_id: z.string().uuid().optional().describe('Project ID to create task in'),
      column_id: z.string().uuid().optional().describe('Kanban column ID (overrides status-based inference)'),
      status: z.string().optional().describe('Initial task status (supports custom statuses per project)'),
      priority: z.enum(['none', 'low', 'medium', 'high']).optional().describe('Task priority'),
      due_date: z.string().optional().describe('Due date (ISO 8601 format, e.g., 2025-12-31)'),
      estimated_pomodoros: z.number().int().min(1).optional().describe('Estimated pomodoros (25 min each)'),
      assignee_id: z.string().uuid().optional().describe('Assignee user ID'),
      tags: z.array(z.string()).optional().describe('Task tags'),
      sync_column: z.boolean().optional().default(true).describe('Auto-place in column based on status (default: true)'),
    },
    async (input) => {
      try {
        await ensureAuthenticated(client);
        let inferredColumnId: string | undefined;
        let inferredStatus: string | undefined;
        let syncDirection: 'status-to-column' | 'column-to-status' | null = null;

        // Bidirectional sync logic for project tasks
        if (input.project_id && input.sync_column !== false) {
          try {
            const columns = await client.getProjectColumns(input.project_id);

            if (input.status && !input.column_id) {
              // Status → Column: Infer column from status
              const targetColumn = inferColumnFromStatus(columns, input.status);
              if (targetColumn) {
                inferredColumnId = targetColumn.id;
                syncDirection = 'status-to-column';
              }
            } else if (input.column_id && !input.status) {
              // Column → Status: Infer status from column
              const targetColumn = columns.find(c => c.id === input.column_id);
              if (targetColumn) {
                const status = inferStatusFromColumn(targetColumn);
                if (status) {
                  inferredStatus = status;
                  syncDirection = 'column-to-status';
                  logger.info(
                    `[Joan MCP] Inferred status '${status}' from column '${targetColumn.name}'`
                  );
                }
              }
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
          status: input.status || inferredStatus,
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
        if (syncDirection === 'status-to-column') message += ' in matching column';
        if (syncDirection === 'column-to-status') message += ` with status '${inferredStatus}'`;

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
    'Update an existing task in Joan. When status changes, the task is automatically moved to the matching Kanban column unless sync_column is false or an explicit column_id is provided. When column_id changes, the task status is automatically updated to match the column\'s default status.',
    {
      task_id: z.string().uuid().describe('Task ID to update'),
      title: z.string().min(1).optional().describe('New task title'),
      description: z.string().optional().describe('New task description'),
      column_id: z.string().uuid().optional().describe('Move to column ID (overrides auto-sync)'),
      status: z.string().optional().describe('New task status (supports custom statuses per project)'),
      priority: z.enum(['none', 'low', 'medium', 'high']).optional().describe('New priority'),
      due_date: z.string().optional().describe('New due date (ISO 8601 format)'),
      estimated_pomodoros: z.number().int().min(1).optional().describe('New estimated pomodoros'),
      assignee_id: z.string().uuid().optional().describe('New assignee user ID'),
      tags: z.array(z.string()).optional().describe('New task tags'),
      sync_column: z.boolean().optional().default(true).describe('Auto-sync column when status changes (default: true)'),
    },
    async (input) => {
      try {
        await ensureAuthenticated(client);
        let inferredColumnId: string | undefined;
        let inferredStatus: string | undefined;
        let syncDirection: 'status-to-column' | 'column-to-status' | null = null;

        // Bidirectional sync: status ↔ column
        if (input.sync_column !== false) {
          try {
            // Get task to find its project and current state
            const existingTask = await client.getTask(input.task_id);

            if (existingTask.project_id) {
              // Get project columns
              const columns = await client.getProjectColumns(existingTask.project_id);

              if (input.status && !input.column_id) {
                // Status → Column: Infer column from new status
                const targetColumn = inferColumnFromStatus(columns, input.status);

                if (targetColumn && targetColumn.id !== existingTask.column_id) {
                  inferredColumnId = targetColumn.id;
                  syncDirection = 'status-to-column';
                }
              } else if (input.column_id && !input.status) {
                // Column → Status: Infer status from new column
                const targetColumn = columns.find(c => c.id === input.column_id);
                if (targetColumn && input.column_id !== existingTask.column_id) {
                  const status = inferStatusFromColumn(targetColumn);
                  if (status) {
                    inferredStatus = status;
                    syncDirection = 'column-to-status';
                    logger.info(
                      `[Joan MCP] Inferred status '${status}' from column '${targetColumn.name}'`
                    );
                  }
                }
              }
            }
          } catch {
            // Column inference failed - proceed without it
          }
        }

        const apiInput = formatTaskInput({
          title: input.title || '',
          description: input.description,
          status: input.status || inferredStatus,
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

        let message = `Updated task "${task.title}" (ID: ${task.id})`;
        if (syncDirection === 'status-to-column') message += ' and moved to matching column';
        if (syncDirection === 'column-to-status') message += ` with status '${inferredStatus}'`;

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
        await ensureAuthenticated(client);
        // Get task info before completing (need project_id and task_number)
        const task = await client.getTask(input.task_id);

        // Complete the task (updates status to done)
        await client.completeTask(input.task_id);

        let columnSynced = false;
        let columnName = '';

        // If sync_column is enabled, also move to Done column
        if (input.sync_column !== false) {
          if (task.project_id) {
            // Get project columns
            const columns = await client.getProjectColumns(task.project_id);

            // Find the Done column - CRITICAL: Use required=true to fail loudly
            // This will throw an error if no Done column is found
            const doneColumn = inferColumnFromStatus(columns, 'done', { required: true });

            // TypeScript doesn't know required=true guarantees non-null, so we check
            if (doneColumn && doneColumn.id !== task.column_id) {
              // Move task to Done column
              await client.updateTask(input.task_id, { column_id: doneColumn.id });
              columnSynced = true;
              columnName = doneColumn.name;
              logger.info(
                `[Joan MCP] Moved task #${task.task_number} to ${doneColumn.name} column`
              );
            }
          }
        }

        const message = columnSynced
          ? `Task #${task.task_number} marked as complete and moved to ${columnName} column`
          : `Task #${task.task_number} marked as complete`;

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
        await ensureAuthenticated(client);
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
        status: z.string().optional().describe('New status (supports custom statuses per project)'),
      })).min(1).max(100).describe('Array of task updates (max 100)'),
    },
    async (input) => {
      try {
        await ensureAuthenticated(client);
        // Enrich updates with bidirectional column ↔ status inference
        const enrichedUpdates = await Promise.all(
          input.updates.map(async (update) => {
            let columnId = update.column_id;
            let status = update.status;

            try {
              const task = await client.getTask(update.task_id);

              if (task.project_id) {
                const columns = await client.getProjectColumns(task.project_id);

                if (update.status && !update.column_id) {
                  // Status → Column: Auto-infer column if status changed but column not specified
                  const inferredColumn = inferColumnFromStatus(
                    columns,
                    update.status,
                    { required: false }
                  );

                  if (inferredColumn) {
                    columnId = inferredColumn.id;
                    logger.info(
                      `[Joan MCP] Auto-inferred column for task #${task.task_number}: ` +
                      `status=${update.status} → column=${inferredColumn.name}`
                    );
                  } else {
                    logger.warn(
                      `[Joan MCP] Could not infer column for task #${task.task_number} ` +
                      `with status=${update.status}. Column unchanged.`
                    );
                  }
                } else if (update.column_id && !update.status) {
                  // Column → Status: Auto-infer status if column changed but status not specified
                  const targetColumn = columns.find(c => c.id === update.column_id);
                  if (targetColumn) {
                    const inferredStatus = inferStatusFromColumn(targetColumn);
                    if (inferredStatus) {
                      status = inferredStatus;
                      logger.info(
                        `[Joan MCP] Auto-inferred status for task #${task.task_number}: ` +
                        `column=${targetColumn.name} → status=${inferredStatus}`
                      );
                    } else {
                      logger.warn(
                        `[Joan MCP] Could not infer status for task #${task.task_number} ` +
                        `from column=${targetColumn.name}. Status unchanged.`
                      );
                    }
                  }
                }
              }
            } catch (error) {
              logger.error(
                `[Joan MCP] Failed to infer column/status for task ${update.task_id}:`,
                error
              );
              // Continue with other tasks even if one fails
            }

            return {
              id: update.task_id,
              column_id: columnId,
              status: status ? statusToBackend(status) : undefined,
              order_index: 0, // Required by API but we just use 0 for bulk status/column updates
            };
          })
        );

        const result = await client.bulkUpdateTasks(enrichedUpdates);

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
