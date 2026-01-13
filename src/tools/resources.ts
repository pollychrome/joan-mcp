/**
 * MCP tools for resource (links/notes) management
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { JoanApiClient } from '../client/api-client.js';
import { formatErrorForMcp } from '../utils/errors.js';
import type { ResourceType } from '../client/types.js';

const resourceTypeSchema = z.enum(['link', 'note', 'article', 'video', 'book', 'tool', 'guide']);

function formatResource(r: { id: string; type: string; title: string | null; url?: string | null; description?: string | null; source?: string | null; created_by_name?: string; created_at: string }): string {
  const lines = [`[${r.type.toUpperCase()}] ${r.title || '(untitled)'}`];
  lines.push(`  ID: ${r.id}`);
  if (r.url) lines.push(`  URL: ${r.url}`);
  if (r.description) lines.push(`  Description: ${r.description}`);
  if (r.source) lines.push(`  Source: ${r.source}`);
  if (r.created_by_name) lines.push(`  Created by: ${r.created_by_name}`);
  lines.push(`  Created: ${r.created_at}`);
  return lines.join('\n');
}

export function registerResourceTools(server: McpServer, client: JoanApiClient): void {
  // ============ Task Resources ============

  // List Task Resources
  server.tool(
    'list_task_resources',
    'List resources (links, notes, references) attached to a task.',
    {
      task_id: z.string().uuid().describe('Task ID'),
      type: resourceTypeSchema.optional().describe('Filter by resource type'),
    },
    async (input) => {
      try {
        const resources = await client.listTaskResources(input.task_id, input.type);

        if (resources.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No resources found for task ${input.task_id}`,
            }],
          };
        }

        const formatted = resources.map(formatResource);

        return {
          content: [{
            type: 'text',
            text: `Resources for task ${input.task_id}:\n\n${formatted.join('\n\n')}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Create Task Resource
  server.tool(
    'create_task_resource',
    'Add a resource (link, note, or reference) to a task.',
    {
      task_id: z.string().uuid().describe('Task ID'),
      type: resourceTypeSchema.describe('Resource type'),
      title: z.string().optional().describe('Resource title'),
      url: z.string().url().optional().describe('URL (required for link type)'),
      content: z.string().optional().describe('Content (for notes)'),
      description: z.string().optional().describe('Description'),
      source: z.string().optional().describe('Source attribution'),
    },
    async (input) => {
      try {
        // Validate URL is provided for link type
        if (input.type === 'link' && !input.url) {
          return {
            content: [{
              type: 'text',
              text: 'Error: URL is required for link type resources',
            }],
          };
        }

        const resource = await client.createTaskResource(input.task_id, {
          type: input.type as ResourceType,
          title: input.title,
          url: input.url,
          content: input.content,
          description: input.description,
          source: input.source,
        });

        return {
          content: [{
            type: 'text',
            text: `Created ${resource.type} resource "${resource.title || '(untitled)'}" (ID: ${resource.id})`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Update Task Resource
  server.tool(
    'update_task_resource',
    'Update a resource attached to a task.',
    {
      task_id: z.string().uuid().describe('Task ID'),
      resource_id: z.string().uuid().describe('Resource ID'),
      title: z.string().optional().describe('New title'),
      url: z.string().url().optional().describe('New URL'),
      content: z.string().optional().describe('New content'),
      description: z.string().optional().describe('New description'),
      source: z.string().optional().describe('New source'),
    },
    async (input) => {
      try {
        const updateData: Record<string, unknown> = {};
        if (input.title !== undefined) updateData.title = input.title;
        if (input.url !== undefined) updateData.url = input.url;
        if (input.content !== undefined) updateData.content = input.content;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.source !== undefined) updateData.source = input.source;

        const resource = await client.updateTaskResource(
          input.task_id,
          input.resource_id,
          updateData
        );

        return {
          content: [{
            type: 'text',
            text: `Updated resource "${resource.title || '(untitled)'}" (ID: ${resource.id})`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Delete Task Resource
  server.tool(
    'delete_task_resource',
    'Delete a resource from a task.',
    {
      task_id: z.string().uuid().describe('Task ID'),
      resource_id: z.string().uuid().describe('Resource ID'),
    },
    async (input) => {
      try {
        await client.deleteTaskResource(input.task_id, input.resource_id);

        return {
          content: [{
            type: 'text',
            text: `Resource ${input.resource_id} deleted from task`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // ============ Project Resources ============

  // List Project Resources
  server.tool(
    'list_project_resources',
    'List resources (links, notes) attached to a project.',
    {
      project_id: z.string().uuid().describe('Project ID'),
    },
    async (input) => {
      try {
        const resources = await client.listProjectResources(input.project_id);

        if (resources.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No resources found for project ${input.project_id}`,
            }],
          };
        }

        const formatted = resources.map(formatResource);

        return {
          content: [{
            type: 'text',
            text: `Resources for project ${input.project_id}:\n\n${formatted.join('\n\n')}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Create Project Resource
  server.tool(
    'create_project_resource',
    'Add a resource (link or note) to a project.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      type: z.enum(['link', 'note']).describe('Resource type (projects only support link or note)'),
      title: z.string().optional().describe('Resource title'),
      url: z.string().url().optional().describe('URL (required for link type)'),
      content: z.string().optional().describe('Content (for notes)'),
      description: z.string().optional().describe('Description'),
      source: z.string().optional().describe('Source attribution'),
    },
    async (input) => {
      try {
        if (input.type === 'link' && !input.url) {
          return {
            content: [{
              type: 'text',
              text: 'Error: URL is required for link type resources',
            }],
          };
        }

        const resource = await client.createProjectResource(input.project_id, {
          type: input.type as ResourceType,
          title: input.title,
          url: input.url,
          content: input.content,
          description: input.description,
          source: input.source,
        });

        return {
          content: [{
            type: 'text',
            text: `Created ${resource.type} resource "${resource.title || '(untitled)'}" (ID: ${resource.id})`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Update Project Resource
  server.tool(
    'update_project_resource',
    'Update a resource attached to a project.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      resource_id: z.string().uuid().describe('Resource ID'),
      title: z.string().optional().describe('New title'),
      url: z.string().url().optional().describe('New URL'),
      content: z.string().optional().describe('New content'),
      description: z.string().optional().describe('New description'),
      source: z.string().optional().describe('New source'),
    },
    async (input) => {
      try {
        const updateData: Record<string, unknown> = {};
        if (input.title !== undefined) updateData.title = input.title;
        if (input.url !== undefined) updateData.url = input.url;
        if (input.content !== undefined) updateData.content = input.content;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.source !== undefined) updateData.source = input.source;

        const resource = await client.updateProjectResource(
          input.project_id,
          input.resource_id,
          updateData
        );

        return {
          content: [{
            type: 'text',
            text: `Updated resource "${resource.title || '(untitled)'}" (ID: ${resource.id})`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Delete Project Resource
  server.tool(
    'delete_project_resource',
    'Delete a resource from a project.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      resource_id: z.string().uuid().describe('Resource ID'),
    },
    async (input) => {
      try {
        await client.deleteProjectResource(input.project_id, input.resource_id);

        return {
          content: [{
            type: 'text',
            text: `Resource ${input.resource_id} deleted from project`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // ============ Milestone Resources ============

  // List Milestone Resources
  server.tool(
    'list_milestone_resources',
    'List resources (links, notes) attached to a milestone.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      milestone_id: z.string().uuid().describe('Milestone ID'),
    },
    async (input) => {
      try {
        const resources = await client.listMilestoneResources(
          input.project_id,
          input.milestone_id
        );

        if (resources.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No resources found for milestone ${input.milestone_id}`,
            }],
          };
        }

        const formatted = resources.map(formatResource);

        return {
          content: [{
            type: 'text',
            text: `Resources for milestone ${input.milestone_id}:\n\n${formatted.join('\n\n')}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Create Milestone Resource
  server.tool(
    'create_milestone_resource',
    'Add a resource (link or note) to a milestone.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      milestone_id: z.string().uuid().describe('Milestone ID'),
      type: z.enum(['link', 'note']).describe('Resource type (milestones only support link or note)'),
      title: z.string().optional().describe('Resource title'),
      url: z.string().url().optional().describe('URL (required for link type)'),
      content: z.string().optional().describe('Content (for notes)'),
      description: z.string().optional().describe('Description'),
      source: z.string().optional().describe('Source attribution'),
    },
    async (input) => {
      try {
        if (input.type === 'link' && !input.url) {
          return {
            content: [{
              type: 'text',
              text: 'Error: URL is required for link type resources',
            }],
          };
        }

        const resource = await client.createMilestoneResource(
          input.project_id,
          input.milestone_id,
          {
            type: input.type as ResourceType,
            title: input.title,
            url: input.url,
            content: input.content,
            description: input.description,
            source: input.source,
          }
        );

        return {
          content: [{
            type: 'text',
            text: `Created ${resource.type} resource "${resource.title || '(untitled)'}" (ID: ${resource.id})`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Update Milestone Resource
  server.tool(
    'update_milestone_resource',
    'Update a resource attached to a milestone.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      milestone_id: z.string().uuid().describe('Milestone ID'),
      resource_id: z.string().uuid().describe('Resource ID'),
      title: z.string().optional().describe('New title'),
      url: z.string().url().optional().describe('New URL'),
      content: z.string().optional().describe('New content'),
      description: z.string().optional().describe('New description'),
      source: z.string().optional().describe('New source'),
    },
    async (input) => {
      try {
        const updateData: Record<string, unknown> = {};
        if (input.title !== undefined) updateData.title = input.title;
        if (input.url !== undefined) updateData.url = input.url;
        if (input.content !== undefined) updateData.content = input.content;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.source !== undefined) updateData.source = input.source;

        const resource = await client.updateMilestoneResource(
          input.project_id,
          input.milestone_id,
          input.resource_id,
          updateData
        );

        return {
          content: [{
            type: 'text',
            text: `Updated resource "${resource.title || '(untitled)'}" (ID: ${resource.id})`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Delete Milestone Resource
  server.tool(
    'delete_milestone_resource',
    'Delete a resource from a milestone.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      milestone_id: z.string().uuid().describe('Milestone ID'),
      resource_id: z.string().uuid().describe('Resource ID'),
    },
    async (input) => {
      try {
        await client.deleteMilestoneResource(
          input.project_id,
          input.milestone_id,
          input.resource_id
        );

        return {
          content: [{
            type: 'text',
            text: `Resource ${input.resource_id} deleted from milestone`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );
}
