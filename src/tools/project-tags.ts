/**
 * MCP tools for project tag management
 *
 * Project tags are color-coded labels that can be assigned to tasks within a project.
 * Tags are defined at the project level and referenced by ID when assigning to tasks.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { JoanApiClient } from '../client/api-client.js';
import { formatErrorForMcp } from '../utils/errors.js';
import { ensureAuthenticated } from '../index.js';

// Predefined color palette (matches backend TAG_COLORS)
const TAG_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#6B7280', // Gray (default)
] as const;

export function registerProjectTagTools(server: McpServer, client: JoanApiClient): void {
  // ============ Project Tag Management ============

  // List Project Tags
  server.tool(
    'list_project_tags',
    'List all tags defined for a project. Returns tag IDs, names, and colors. Use these IDs when assigning tags to tasks.',
    {
      project_id: z.string().uuid().describe('Project ID to list tags for'),
    },
    async (input) => {
      try {
        await ensureAuthenticated(client);
        const tags = await client.listProjectTags(input.project_id);

        if (tags.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No tags found for project ${input.project_id}. Use create_project_tag to add tags.`,
            }],
          };
        }

        const tagList = tags.map(t =>
          `- ${t.name} (ID: ${t.id}) [${t.color}]`
        ).join('\n');

        return {
          content: [{
            type: 'text',
            text: `Found ${tags.length} tag(s) for project ${input.project_id}:\n\n${tagList}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Get Single Project Tag
  server.tool(
    'get_project_tag',
    'Get detailed information about a specific project tag.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      tag_id: z.string().uuid().describe('Tag ID to retrieve'),
    },
    async (input) => {
      try {
        await ensureAuthenticated(client);
        const tag = await client.getProjectTag(input.project_id, input.tag_id);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(tag, null, 2),
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Create Project Tag
  server.tool(
    'create_project_tag',
    'Create a new tag for a project. Tags can be assigned to tasks within the project.',
    {
      project_id: z.string().uuid().describe('Project ID to create tag in'),
      name: z.string().min(1).max(50).describe('Tag name (must be unique within project)'),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
        .describe(`Hex color code (e.g., "#3B82F6"). Defaults to gray. Available colors: ${TAG_COLORS.join(', ')}`),
    },
    async (input) => {
      try {
        await ensureAuthenticated(client);
        const tag = await client.createProjectTag(input.project_id, {
          name: input.name,
          color: input.color,
        });

        return {
          content: [{
            type: 'text',
            text: `Created tag "${tag.name}" (ID: ${tag.id}) with color ${tag.color}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Update Project Tag
  server.tool(
    'update_project_tag',
    'Update an existing project tag (name or color).',
    {
      project_id: z.string().uuid().describe('Project ID'),
      tag_id: z.string().uuid().describe('Tag ID to update'),
      name: z.string().min(1).max(50).optional().describe('New tag name'),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe('New hex color code'),
    },
    async (input) => {
      try {
        await ensureAuthenticated(client);
        const tag = await client.updateProjectTag(input.project_id, input.tag_id, {
          name: input.name,
          color: input.color,
        });

        return {
          content: [{
            type: 'text',
            text: `Updated tag "${tag.name}" (ID: ${tag.id})`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Delete Project Tag
  server.tool(
    'delete_project_tag',
    'Delete a project tag. This will also remove the tag from all tasks that have it assigned.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      tag_id: z.string().uuid().describe('Tag ID to delete'),
    },
    async (input) => {
      try {
        await ensureAuthenticated(client);
        await client.deleteProjectTag(input.project_id, input.tag_id);

        return {
          content: [{
            type: 'text',
            text: `Tag ${input.tag_id} deleted from project ${input.project_id}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // ============ Task Tag Assignments ============

  // Get Task Tags
  server.tool(
    'get_task_tags',
    'Get all tags assigned to a specific task.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      task_id: z.string().uuid().describe('Task ID to get tags for'),
    },
    async (input) => {
      try {
        await ensureAuthenticated(client);
        const tags = await client.getTaskTags(input.project_id, input.task_id);

        if (tags.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No tags assigned to task ${input.task_id}.`,
            }],
          };
        }

        const tagList = tags.map(t =>
          `- ${t.name} (ID: ${t.id}) [${t.color}]`
        ).join('\n');

        return {
          content: [{
            type: 'text',
            text: `Task ${input.task_id} has ${tags.length} tag(s):\n\n${tagList}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Add Tag to Task
  server.tool(
    'add_tag_to_task',
    'Assign a project tag to a task.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      task_id: z.string().uuid().describe('Task ID to add tag to'),
      tag_id: z.string().uuid().describe('Tag ID to assign'),
    },
    async (input) => {
      try {
        await ensureAuthenticated(client);
        await client.addTagToTask(input.project_id, input.task_id, input.tag_id);

        return {
          content: [{
            type: 'text',
            text: `Added tag ${input.tag_id} to task ${input.task_id}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Remove Tag from Task
  server.tool(
    'remove_tag_from_task',
    'Remove a tag from a task.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      task_id: z.string().uuid().describe('Task ID to remove tag from'),
      tag_id: z.string().uuid().describe('Tag ID to remove'),
    },
    async (input) => {
      try {
        await ensureAuthenticated(client);
        await client.removeTagFromTask(input.project_id, input.task_id, input.tag_id);

        return {
          content: [{
            type: 'text',
            text: `Removed tag ${input.tag_id} from task ${input.task_id}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Set Task Tags (bulk replace)
  server.tool(
    'set_task_tags',
    'Replace all tags on a task with a new set of tags. Pass an empty array to remove all tags.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      task_id: z.string().uuid().describe('Task ID to update tags for'),
      tag_ids: z.array(z.string().uuid()).describe('Array of tag IDs to assign (replaces existing tags)'),
    },
    async (input) => {
      try {
        await ensureAuthenticated(client);
        const tags = await client.setTaskTags(input.project_id, input.task_id, input.tag_ids);

        if (tags.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `Removed all tags from task ${input.task_id}`,
            }],
          };
        }

        const tagNames = tags.map(t => t.name).join(', ');
        return {
          content: [{
            type: 'text',
            text: `Updated task ${input.task_id} with ${tags.length} tag(s): ${tagNames}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );
}
