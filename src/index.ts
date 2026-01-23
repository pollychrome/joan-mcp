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
import { withTimeout } from './utils/timeout.js';
import { logger } from './utils/logger.js';

const SERVER_NAME = 'joan-mcp';
const SERVER_VERSION = '2.2.0';

/**
 * Global state for lazy authentication verification
 */
let authVerified = false;
let authVerificationPromise: Promise<void> | null = null;

/**
 * Ensure authentication is valid before making API calls.
 * Verifies lazily on first use, not during server startup.
 */
export async function ensureAuthenticated(apiClient: JoanApiClient): Promise<void> {
  if (authVerified) return; // Already verified
  if (authVerificationPromise) return authVerificationPromise; // Verification in progress

  authVerificationPromise = (async () => {
    try {
      await apiClient.getCurrentUser();
      logger.info('Auth verification succeeded');
      authVerified = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Authentication failed: ${errorMessage}. Run "joan-mcp login" or check JOAN_AUTH_TOKEN.`
      );
    } finally {
      authVerificationPromise = null;
    }
  })();

  return authVerificationPromise;
}

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

### Columns
- list_columns: List Kanban columns for a project (requires project_id)
- create_column: Create a new column (requires project_id, name; optional: position, default_status, color)
- update_column: Update column properties (requires project_id, column_id; optional: name, default_status, color)
- delete_column: Delete a column (requires project_id, column_id; optional: move_tasks_to)
- reorder_columns: Reorder columns (requires project_id, column_order array of column IDs)

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
  const serverStartTime = Date.now();
  logger.info('Starting server');

  // Load configuration (fast)
  const configStart = Date.now();
  const config = await loadConfig();
  logger.debug(`Configuration loaded in ${Date.now() - configStart}ms`);

  // Initialize API client (fast)
  const clientStart = Date.now();
  const apiClient = new JoanApiClient({
    baseUrl: config.apiUrl,
    authToken: config.authToken,
  });
  logger.debug(`API client initialized in ${Date.now() - clientStart}ms`);

  // Optional background auth verification (non-blocking, enabled by default)
  // Set JOAN_MCP_VERIFY_ON_STARTUP=false to disable completely
  if (process.env.JOAN_MCP_VERIFY_ON_STARTUP !== 'false') {
    apiClient.getCurrentUser()
      .then(() => logger.info('Background auth verification succeeded'))
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`Background auth verification failed: ${errorMessage}`);
      });
  }

  // Create MCP server with instructions for AI assistants
  const serverCreateStart = Date.now();
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      instructions: SERVER_INSTRUCTIONS,
    }
  );
  logger.debug(`MCP server created in ${Date.now() - serverCreateStart}ms`);

  // Register all tools (write operations)
  const toolsStart = Date.now();
  registerAllTools(server, apiClient);
  logger.debug(`Tools registered in ${Date.now() - toolsStart}ms`);

  // Register all resources (read operations)
  const resourcesStart = Date.now();
  registerAllResources(server, apiClient);
  logger.debug(`Resources registered in ${Date.now() - resourcesStart}ms`);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  const connectTimeoutEnv = process.env.JOAN_MCP_CONNECT_TIMEOUT_MS;
  const connectTimeoutMs = connectTimeoutEnv
    ? Number.parseInt(connectTimeoutEnv, 10)
    : 30000;
  const safeConnectTimeoutMs = Number.isFinite(connectTimeoutMs) && connectTimeoutMs > 0
    ? connectTimeoutMs
    : 30000;
  const connectStart = Date.now();
  await withTimeout(
    server.connect(transport),
    safeConnectTimeoutMs,
    `Joan MCP connection timeout after ${safeConnectTimeoutMs}ms`
  );
  logger.debug(`Transport connected in ${Date.now() - connectStart}ms`);

  const startupTime = Date.now() - serverStartTime;
  logger.info(`Server ready (handshake complete in ${startupTime}ms)`);
}

// Export for CLI
export { loadConfig } from './config.js';
export { JoanApiClient } from './client/api-client.js';
