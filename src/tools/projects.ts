/**
 * MCP tools for project management
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { JoanApiClient } from '../client/api-client.js';
import { formatErrorForMcp } from '../utils/errors.js';

export function registerProjectTools(server: McpServer, client: JoanApiClient): void {
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
}
