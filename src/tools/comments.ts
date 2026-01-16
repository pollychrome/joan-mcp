/**
 * MCP tools for comment management on tasks and milestones
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { JoanApiClient } from '../client/api-client.js';
import { formatErrorForMcp } from '../utils/errors.js';

export function registerCommentTools(server: McpServer, client: JoanApiClient): void {
  // ============ Task Comments ============

  // List Task Comments
  server.tool(
    'list_task_comments',
    'List all comments on a specific task.',
    {
      task_id: z.string().uuid().describe('Task ID to list comments for'),
    },
    async (input) => {
      try {
        const comments = await client.listTaskComments(input.task_id);

        if (comments.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No comments found for task ${input.task_id}.`,
            }],
          };
        }

        const commentList = comments.map(c => {
          const author = c.user_name || 'Unknown';
          const date = new Date(c.created_at).toLocaleString();
          return `- [${c.id}] **${author}** (${date}):\n  "${c.content}"`;
        }).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Found ${comments.length} comment(s):\n\n${commentList}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Create Task Comment
  server.tool(
    'create_task_comment',
    'Add a comment to a task.',
    {
      task_id: z.string().uuid().describe('Task ID to comment on'),
      content: z.string().min(1).max(10000).describe('Comment content (supports markdown)'),
    },
    async (input) => {
      try {
        const comment = await client.createTaskComment(input.task_id, {
          content: input.content,
        });

        return {
          content: [{
            type: 'text',
            text: `Comment added to task ${input.task_id}.\nComment ID: ${comment.id}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Update Task Comment
  server.tool(
    'update_task_comment',
    'Edit an existing comment on a task. Only the comment author or project admins can edit.',
    {
      task_id: z.string().uuid().describe('Task ID'),
      comment_id: z.string().uuid().describe('Comment ID to update'),
      content: z.string().min(1).max(10000).describe('New comment content'),
    },
    async (input) => {
      try {
        await client.updateTaskComment(input.task_id, input.comment_id, {
          content: input.content,
        });

        return {
          content: [{
            type: 'text',
            text: `Comment ${input.comment_id} updated successfully.`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Delete Task Comment
  server.tool(
    'delete_task_comment',
    'Remove a comment from a task. Only the comment author or project admins can delete.',
    {
      task_id: z.string().uuid().describe('Task ID'),
      comment_id: z.string().uuid().describe('Comment ID to delete'),
    },
    async (input) => {
      try {
        await client.deleteTaskComment(input.task_id, input.comment_id);

        return {
          content: [{
            type: 'text',
            text: `Comment ${input.comment_id} deleted from task ${input.task_id}.`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // ============ Milestone Comments ============

  // List Milestone Comments
  server.tool(
    'list_milestone_comments',
    'List all comments on a specific milestone.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      milestone_id: z.string().uuid().describe('Milestone ID to list comments for'),
    },
    async (input) => {
      try {
        const comments = await client.listMilestoneComments(
          input.project_id,
          input.milestone_id
        );

        if (comments.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No comments found for milestone ${input.milestone_id}.`,
            }],
          };
        }

        const commentList = comments.map(c => {
          const author = c.user_name || 'Unknown';
          const date = new Date(c.created_at).toLocaleString();
          return `- [${c.id}] **${author}** (${date}):\n  "${c.content}"`;
        }).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Found ${comments.length} comment(s):\n\n${commentList}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Create Milestone Comment
  server.tool(
    'create_milestone_comment',
    'Add a comment to a milestone.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      milestone_id: z.string().uuid().describe('Milestone ID to comment on'),
      content: z.string().min(1).max(10000).describe('Comment content (supports markdown)'),
    },
    async (input) => {
      try {
        const comment = await client.createMilestoneComment(
          input.project_id,
          input.milestone_id,
          { content: input.content }
        );

        return {
          content: [{
            type: 'text',
            text: `Comment added to milestone ${input.milestone_id}.\nComment ID: ${comment.id}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Update Milestone Comment
  server.tool(
    'update_milestone_comment',
    'Edit an existing comment on a milestone. Only the comment author or project admins can edit.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      milestone_id: z.string().uuid().describe('Milestone ID'),
      comment_id: z.string().uuid().describe('Comment ID to update'),
      content: z.string().min(1).max(10000).describe('New comment content'),
    },
    async (input) => {
      try {
        await client.updateMilestoneComment(
          input.project_id,
          input.milestone_id,
          input.comment_id,
          { content: input.content }
        );

        return {
          content: [{
            type: 'text',
            text: `Comment ${input.comment_id} updated successfully.`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Delete Milestone Comment
  server.tool(
    'delete_milestone_comment',
    'Remove a comment from a milestone. Only the comment author or project admins can delete.',
    {
      project_id: z.string().uuid().describe('Project ID'),
      milestone_id: z.string().uuid().describe('Milestone ID'),
      comment_id: z.string().uuid().describe('Comment ID to delete'),
    },
    async (input) => {
      try {
        await client.deleteMilestoneComment(
          input.project_id,
          input.milestone_id,
          input.comment_id
        );

        return {
          content: [{
            type: 'text',
            text: `Comment ${input.comment_id} deleted from milestone ${input.milestone_id}.`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );
}
