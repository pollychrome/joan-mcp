/**
 * MCP resources for project data
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { JoanApiClient } from '../client/api-client.js';

export function registerProjectResources(server: McpServer, client: JoanApiClient): void {
  // List all projects
  server.resource(
    'joan://projects',
    'List all projects',
    async () => {
      const projects = await client.listProjects({ include_members: true });

      return {
        contents: [{
          uri: 'joan://projects',
          mimeType: 'application/json',
          text: JSON.stringify(projects, null, 2),
        }],
      };
    }
  );

  // Project details resource template
  server.resource(
    'joan://projects/{projectId}',
    'Get detailed information about a specific project',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/projects\/([^/]+)$/);
      const projectId = match?.[1];

      if (!projectId) {
        throw new Error('Invalid project URI');
      }

      const project = await client.getProject(projectId);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(project, null, 2),
        }],
      };
    }
  );

  // Project tasks resource template
  server.resource(
    'joan://projects/{projectId}/tasks',
    'Get all tasks for a specific project',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/projects\/([^/]+)\/tasks$/);
      const projectId = match?.[1];

      if (!projectId) {
        throw new Error('Invalid project tasks URI');
      }

      const tasks = await client.getProjectTasks(projectId);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(tasks, null, 2),
        }],
      };
    }
  );

  // Project milestones resource template
  server.resource(
    'joan://projects/{projectId}/milestones',
    'Get all milestones for a specific project',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/projects\/([^/]+)\/milestones$/);
      const projectId = match?.[1];

      if (!projectId) {
        throw new Error('Invalid project milestones URI');
      }

      const milestones = await client.listMilestones(projectId, { include_tasks: true });

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(milestones, null, 2),
        }],
      };
    }
  );

  // Project columns resource template
  server.resource(
    'joan://projects/{projectId}/columns',
    'Get kanban columns for a specific project',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/projects\/([^/]+)\/columns$/);
      const projectId = match?.[1];

      if (!projectId) {
        throw new Error('Invalid project columns URI');
      }

      const columns = await client.getProjectColumns(projectId);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(columns, null, 2),
        }],
      };
    }
  );

  // Project analytics resource template
  server.resource(
    'joan://projects/{projectId}/analytics',
    'Get analytics and statistics for a specific project',
    async (uri) => {
      const match = uri.pathname.match(/^\/\/projects\/([^/]+)\/analytics$/);
      const projectId = match?.[1];

      if (!projectId) {
        throw new Error('Invalid project analytics URI');
      }

      const analytics = await client.getProjectAnalytics(projectId);

      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify(analytics, null, 2),
        }],
      };
    }
  );
}
