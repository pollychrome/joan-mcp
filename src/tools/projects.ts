/**
 * MCP tools for project management
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { JoanApiClient } from '../client/api-client.js';
import { formatErrorForMcp } from '../utils/errors.js';
import { formatColumnsForDisplay } from '../utils/column-mapper.js';

export function registerProjectTools(server: McpServer, client: JoanApiClient): void {
  // List Projects (Read)
  server.tool(
    'list_projects',
    'List all projects in Joan. Returns project IDs, names, descriptions, and status.',
    {
      status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional().describe('Filter by project status'),
      include_members: z.boolean().optional().describe('Include project members in response'),
    },
    async (input) => {
      try {
        const projects = await client.listProjects({
          status: input.status,
          include_members: input.include_members,
        });

        if (projects.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No projects found.',
            }],
          };
        }

        const projectList = projects.map(p =>
          `- ${p.name} (ID: ${p.id})${p.status ? ` [${p.status}]` : ''}${p.description ? `\n  ${p.description}` : ''}`
        ).join('\n');

        return {
          content: [{
            type: 'text',
            text: `Found ${projects.length} project(s):\n\n${projectList}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Get Project Details (Read)
  server.tool(
    'get_project',
    'Get detailed information about a specific project including stats.',
    {
      project_id: z.string().uuid().describe('Project ID to retrieve'),
    },
    async (input) => {
      try {
        const project = await client.getProject(input.project_id);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(project, null, 2),
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Create Project
  server.tool(
    'create_project',
    'Create a new project in Joan.',
    {
      name: z.string().min(1).describe('Project name'),
      description: z.string().optional().describe('Project description'),
      status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional().describe('Project status'),
      start_date: z.string().optional().describe('Start date (ISO 8601 format)'),
      end_date: z.string().optional().describe('End date (ISO 8601 format)'),
    },
    async (input) => {
      try {
        const project = await client.createProject({
          name: input.name,
          description: input.description,
          status: input.status,
          start_date: input.start_date,
          end_date: input.end_date,
        });

        return {
          content: [{
            type: 'text',
            text: `Created project "${project.name}" (ID: ${project.id})`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Update Project
  server.tool(
    'update_project',
    'Update an existing project in Joan.',
    {
      project_id: z.string().uuid().describe('Project ID to update'),
      name: z.string().min(1).optional().describe('New project name'),
      description: z.string().optional().describe('New project description'),
      status: z.enum(['planning', 'active', 'on_hold', 'completed', 'archived']).optional().describe('New project status'),
      start_date: z.string().optional().describe('New start date (ISO 8601 format)'),
      end_date: z.string().optional().describe('New end date (ISO 8601 format)'),
    },
    async (input) => {
      try {
        const project = await client.updateProject(input.project_id, {
          name: input.name,
          description: input.description,
          status: input.status,
          start_date: input.start_date,
          end_date: input.end_date,
        });

        return {
          content: [{
            type: 'text',
            text: `Updated project "${project.name}" (ID: ${project.id})`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // List Columns
  server.tool(
    'list_columns',
    'List Kanban columns for a project. Returns column IDs, names, positions, and default status. Use this to discover column IDs before moving tasks.',
    {
      project_id: z.string().uuid().describe('Project ID to get columns for'),
    },
    async (input) => {
      try {
        const columns = await client.getProjectColumns(input.project_id);

        return {
          content: [{
            type: 'text',
            text: formatColumnsForDisplay(columns),
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Create Column
  server.tool(
    'create_column',
    'Create a new Kanban column in a project. Column names must be unique within the project.',
    {
      project_id: z.string().uuid().describe('Project ID to create column in'),
      name: z.string().min(1).max(50).describe('Column display name (1-50 chars)'),
      position: z.number().int().min(0).optional().describe('Insert position (0-indexed). Omit to append at end.'),
      default_status: z.string().optional().describe('Status for tasks placed in this column'),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe('Hex color code (e.g., "#3B82F6")'),
    },
    async (input) => {
      try {
        const column = await client.createColumn(input.project_id, {
          name: input.name,
          position: input.position,
          default_status: input.default_status,
          color: input.color,
        });

        return {
          content: [{
            type: 'text',
            text: `Created column "${column.name}" (ID: ${column.id}) at position ${column.position}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Update Column
  server.tool(
    'update_column',
    'Update an existing column\'s properties. Does not change position (use reorder_columns for that).',
    {
      project_id: z.string().uuid().describe('Project ID'),
      column_id: z.string().uuid().describe('Column ID to update'),
      name: z.string().min(1).max(50).optional().describe('New display name'),
      default_status: z.string().optional().describe('New default status'),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe('New hex color code'),
    },
    async (input) => {
      try {
        const column = await client.updateColumn(input.project_id, input.column_id, {
          name: input.name,
          default_status: input.default_status,
          color: input.color,
        });

        return {
          content: [{
            type: 'text',
            text: `Updated column "${column.name}" (ID: ${column.id})`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Delete Column
  server.tool(
    'delete_column',
    'Delete a column from a project. If the column has tasks, you must specify where to move them.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      column_id: z.string().uuid().describe('Column ID to delete'),
      move_tasks_to: z.string().uuid().optional().describe('Column ID to move tasks to (required if column has tasks)'),
    },
    async (input) => {
      try {
        const result = await client.deleteColumn(
          input.project_id,
          input.column_id,
          input.move_tasks_to
        );

        let message = 'Column deleted successfully.';
        if (result.tasks_moved !== undefined && result.tasks_moved > 0) {
          message += ` ${result.tasks_moved} task(s) moved to target column.`;
        }

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

  // Reorder Columns
  server.tool(
    'reorder_columns',
    'Reorder columns within a project. All existing column IDs must be included in the new order.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      column_order: z.array(z.string().uuid()).min(1).describe('Array of column UUIDs in desired order'),
    },
    async (input) => {
      try {
        const columns = await client.reorderColumns(input.project_id, input.column_order);

        const sortedNames = columns
          .sort((a, b) => a.position - b.position)
          .map(c => c.name)
          .join(' → ');

        return {
          content: [{
            type: 'text',
            text: `Columns reordered: ${sortedNames}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );
}
