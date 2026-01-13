/**
 * Joan MCP Server - Entry Point
 *
 * This MCP server enables AI assistants like Claude to interact with
 * Joan productivity app features including Projects, Tasks, Goals,
 * Milestones, and Notes.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { JoanApiClient } from './client/api-client.js';
import { registerAllTools } from './tools/index.js';
import { registerAllResources } from './resources/index.js';

const SERVER_NAME = 'joan-mcp';
const SERVER_VERSION = '1.0.0';

/**
 * Server instructions that describe Joan MCP to AI assistants.
 * These are automatically sent to clients during initialization.
 */
const SERVER_INSTRUCTIONS = `
Joan is a productivity application for managing projects, tasks, goals, milestones, and notes. This MCP server enables you to interact with the user's Joan data.

## Available Tools

### Projects
- list_projects: List all projects (optional: filter by status)
- get_project: Get detailed info about a specific project
- create_project: Create a new project (name required; optional: description, status, start_date, end_date)
- update_project: Update project properties

### Tasks
- list_tasks: List tasks (optional: filter by project_id, status)
- get_task: Get detailed task info including subtasks
- create_task: Create a new task (requires title; optional: project_id, description, status, priority, due_date, column_id)
- update_task: Update task properties
- complete_task: Mark a task as completed
- delete_task: Delete a task

### Milestones
- list_milestones: List milestones for a project (requires project_id; optional: filter by status)
- get_milestone: Get detailed milestone info with linked tasks
- create_milestone: Create a milestone (requires project_id, name; optional: description, target_date)
- update_milestone: Update milestone details
- delete_milestone: Delete a milestone
- link_tasks_to_milestone: Associate tasks with a milestone
- unlink_task_from_milestone: Remove a task from a milestone

### Goals
- create_goal: Create a new goal (title required; optional: description, target_date, status)
- update_goal: Update goal progress or details
- delete_goal: Delete a goal
- link_task_to_goal: Link a task to track goal progress
- unlink_task_from_goal: Remove task from goal tracking

### Notes
- create_note: Create a new note (title required; optional: content, tags)
- update_note: Update note content or metadata
- delete_note: Delete a note

### Comments
- list_task_comments: Get all comments on a task (requires task_id)
- create_task_comment: Add a comment to a task (requires task_id, content)
- update_task_comment: Edit a task comment (requires task_id, comment_id, content)
- delete_task_comment: Remove a task comment (requires task_id, comment_id)
- list_milestone_comments: Get all comments on a milestone (requires project_id, milestone_id)
- create_milestone_comment: Add a comment to a milestone (requires project_id, milestone_id, content)
- update_milestone_comment: Edit a milestone comment
- delete_milestone_comment: Remove a milestone comment

## Usage Guidelines

1. When the user mentions tasks, projects, goals, or productivity tracking, use Joan tools
2. Use list_projects first to find project IDs, then list_milestones/list_tasks for details
3. Task status values: Projects can define custom statuses. Default statuses are "todo", "in_progress", "done", "cancelled". Use list_columns to see available statuses for a project.
4. Task priority values: "none", "low", "medium", "high"
5. Project status values: "planning", "active", "on_hold", "completed", "archived"
6. Milestone status values: "upcoming", "in_progress", "completed", "missed"
7. Goal status values: "not_started", "in_progress", "completed", "abandoned"
`.trim();


/**
 * Start the MCP server
 */
export async function startServer(): Promise<void> {
  // Load configuration
  const config = await loadConfig();

  // Initialize API client
  const apiClient = new JoanApiClient({
    baseUrl: config.apiUrl,
    authToken: config.authToken,
  });

  // Verify auth token works
  try {
    await apiClient.getCurrentUser();
  } catch (error) {
    console.error('Failed to verify authentication. Please check your token.');
    console.error('Run "joan-mcp login" to authenticate or set JOAN_AUTH_TOKEN.');
    process.exit(1);
  }

  // Create MCP server with instructions for AI assistants
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      instructions: SERVER_INSTRUCTIONS,
    }
  );

  // Register all tools (write operations)
  registerAllTools(server, apiClient);

  // Register all resources (read operations)
  registerAllResources(server, apiClient);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with MCP protocol
  console.error(`${SERVER_NAME} v${SERVER_VERSION} started`);
}

// Export for CLI
export { loadConfig } from './config.js';
export { JoanApiClient } from './client/api-client.js';
