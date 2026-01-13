/**
 * MCP tools for file attachment management
 */

import { readFile } from 'fs/promises';
import { basename, extname } from 'path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { JoanApiClient } from '../client/api-client.js';
import { formatErrorForMcp } from '../utils/errors.js';
import type { AttachmentEntityType, AttachmentCategory } from '../client/types.js';

// Common MIME type mappings
const MIME_TYPES: Record<string, string> = {
  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.rtf': 'application/rtf',
  '.csv': 'text/csv',
  '.md': 'text/markdown',
  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  // Videos
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  // Archives
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed',
  // Code
  '.json': 'application/json',
  '.js': 'text/javascript',
  '.ts': 'text/typescript',
  '.html': 'text/html',
  '.css': 'text/css',
  '.py': 'text/x-python',
  '.java': 'text/x-java-source',
  '.go': 'text/x-go',
  '.rs': 'text/x-rust',
  '.rb': 'text/x-ruby',
  '.php': 'text/x-php',
  '.c': 'text/x-c',
  '.cpp': 'text/x-c++src',
  '.h': 'text/x-c',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.xml': 'application/xml',
};

function getMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function registerAttachmentTools(server: McpServer, client: JoanApiClient): void {
  // Upload Attachment
  server.tool(
    'upload_attachment',
    'Upload a file attachment to Joan. Supports local file paths, base64-encoded content, or URLs to fetch from.',
    {
      // File source (one of these is required)
      file_path: z.string().optional().describe('Local file path to upload'),
      file_base64: z.string().optional().describe('Base64-encoded file content'),
      file_url: z.string().url().optional().describe('URL to fetch file from'),

      // Required filename for base64/URL sources
      filename: z.string().optional().describe('Filename (required for base64/URL, auto-detected for file_path)'),

      // Attachment target (entity)
      entity_type: z.enum(['project', 'milestone', 'task', 'note', 'folder', 'user']).optional()
        .describe('Entity type to attach to'),
      entity_id: z.string().uuid().optional().describe('Entity ID to attach to'),

      // Metadata
      display_name: z.string().optional().describe('Custom display name'),
      description: z.string().optional().describe('Description of the attachment'),
      category: z.enum(['document', 'image', 'video', 'audio', 'archive', 'code', 'other']).optional()
        .describe('Category (auto-detected from MIME type if not specified)'),
      tags: z.array(z.string()).optional().describe('Tags for organization'),
    },
    async (input) => {
      try {
        let fileBuffer: Buffer;
        let filename: string;
        let mimeType: string;

        // Determine file source and load content
        if (input.file_path) {
          // Local file path
          fileBuffer = await readFile(input.file_path);
          filename = input.filename || basename(input.file_path);
          mimeType = getMimeType(filename);
        } else if (input.file_base64) {
          // Base64 encoded content
          if (!input.filename) {
            return {
              content: [{
                type: 'text',
                text: 'Error: filename is required when using file_base64',
              }],
            };
          }
          fileBuffer = Buffer.from(input.file_base64, 'base64');
          filename = input.filename;
          mimeType = getMimeType(filename);
        } else if (input.file_url) {
          // Fetch from URL
          const response = await fetch(input.file_url);
          if (!response.ok) {
            return {
              content: [{
                type: 'text',
                text: `Error: Failed to fetch file from URL (${response.status})`,
              }],
            };
          }
          const arrayBuffer = await response.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuffer);

          // Try to get filename from URL or Content-Disposition
          const contentDisposition = response.headers.get('Content-Disposition');
          if (input.filename) {
            filename = input.filename;
          } else if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
            filename = match?.[1] || basename(new URL(input.file_url).pathname) || 'downloaded_file';
          } else {
            filename = basename(new URL(input.file_url).pathname) || 'downloaded_file';
          }

          // Try to get MIME type from response or filename
          mimeType = response.headers.get('Content-Type')?.split(';')[0] || getMimeType(filename);
        } else {
          return {
            content: [{
              type: 'text',
              text: 'Error: Must provide one of file_path, file_base64, or file_url',
            }],
          };
        }

        // Validate entity_type and entity_id are both provided or both omitted
        if ((input.entity_type && !input.entity_id) || (!input.entity_type && input.entity_id)) {
          return {
            content: [{
              type: 'text',
              text: 'Error: Both entity_type and entity_id must be provided together',
            }],
          };
        }

        // Build metadata
        const metadata = {
          entity_type: input.entity_type as AttachmentEntityType | undefined,
          entity_id: input.entity_id,
          display_name: input.display_name,
          description: input.description,
          category: input.category as AttachmentCategory | undefined,
          tags: input.tags,
        };

        const attachment = await client.uploadAttachment(
          fileBuffer,
          filename,
          mimeType,
          metadata
        );

        return {
          content: [{
            type: 'text',
            text: `Uploaded "${attachment.display_name}" (ID: ${attachment.id})\n` +
                  `  File: ${attachment.filename}\n` +
                  `  Size: ${formatFileSize(attachment.size)}\n` +
                  `  Type: ${attachment.mime_type}\n` +
                  `  Category: ${attachment.category}` +
                  (attachment.entity_type ? `\n  Attached to: ${attachment.entity_type} (${attachment.entity_id})` : ''),
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // List Attachments
  server.tool(
    'list_attachments',
    'List file attachments for a specific entity (project, milestone, task, note, folder, or user).',
    {
      entity_type: z.enum(['project', 'milestone', 'task', 'note', 'folder', 'user'])
        .describe('Entity type'),
      entity_id: z.string().uuid().describe('Entity ID'),
    },
    async (input) => {
      try {
        const attachments = await client.listAttachmentsByEntity(
          input.entity_type as AttachmentEntityType,
          input.entity_id
        );

        if (attachments.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No attachments found for ${input.entity_type} ${input.entity_id}`,
            }],
          };
        }

        const lines = attachments.map(a =>
          `- ${a.display_name} (ID: ${a.id})\n` +
          `  File: ${a.filename} | Size: ${formatFileSize(a.size)} | Type: ${a.category}`
        );

        return {
          content: [{
            type: 'text',
            text: `Attachments for ${input.entity_type} ${input.entity_id}:\n\n${lines.join('\n\n')}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Get Attachment
  server.tool(
    'get_attachment',
    'Get metadata for a specific attachment.',
    {
      attachment_id: z.string().uuid().describe('Attachment ID'),
    },
    async (input) => {
      try {
        const attachment = await client.getAttachmentMetadata(input.attachment_id);

        const info = [
          `Attachment: ${attachment.display_name}`,
          `ID: ${attachment.id}`,
          `Filename: ${attachment.filename}`,
          `Size: ${formatFileSize(attachment.size)}`,
          `MIME Type: ${attachment.mime_type}`,
          `Category: ${attachment.category}`,
        ];

        if (attachment.description) {
          info.push(`Description: ${attachment.description}`);
        }

        if (attachment.tags && attachment.tags.length > 0) {
          info.push(`Tags: ${attachment.tags.join(', ')}`);
        }

        if (attachment.entity_type) {
          info.push(`Attached to: ${attachment.entity_type} (${attachment.entity_id})`);
        }

        info.push(`Uploaded: ${attachment.uploaded_at}`);
        info.push(`Download URL: ${attachment.url}`);

        return {
          content: [{
            type: 'text',
            text: info.join('\n'),
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Update Attachment
  server.tool(
    'update_attachment',
    'Update metadata for an attachment.',
    {
      attachment_id: z.string().uuid().describe('Attachment ID'),
      display_name: z.string().optional().describe('New display name'),
      description: z.string().optional().describe('New description'),
      category: z.enum(['document', 'image', 'video', 'audio', 'archive', 'code', 'other']).optional()
        .describe('New category'),
      tags: z.array(z.string()).optional().describe('New tags'),
    },
    async (input) => {
      try {
        const updateData: Record<string, unknown> = {};
        if (input.display_name !== undefined) updateData.display_name = input.display_name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.category !== undefined) updateData.category = input.category;
        if (input.tags !== undefined) updateData.tags = input.tags;

        const attachment = await client.updateAttachment(input.attachment_id, updateData);

        return {
          content: [{
            type: 'text',
            text: `Updated attachment "${attachment.display_name}" (ID: ${attachment.id})`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Delete Attachment
  server.tool(
    'delete_attachment',
    'Delete an attachment.',
    {
      attachment_id: z.string().uuid().describe('Attachment ID'),
    },
    async (input) => {
      try {
        await client.deleteAttachment(input.attachment_id);

        return {
          content: [{
            type: 'text',
            text: `Attachment ${input.attachment_id} deleted`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Get Attachment Download URL
  server.tool(
    'get_attachment_download_url',
    'Get a download URL for an attachment.',
    {
      attachment_id: z.string().uuid().describe('Attachment ID'),
      expires_in: z.number().optional().describe('URL expiration time in seconds (default: 3600)'),
    },
    async (input) => {
      try {
        const info = await client.getAttachmentDownloadUrl(
          input.attachment_id,
          input.expires_in
        );

        return {
          content: [{
            type: 'text',
            text: `Download URL for "${info.display_name}":\n` +
                  `  URL: ${info.download_url}\n` +
                  `  Expires: ${info.expires_at}\n` +
                  `  Size: ${formatFileSize(info.file_size)}`,
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Get Project Attachment Hierarchy
  server.tool(
    'get_project_attachment_hierarchy',
    'Get all attachments organized by project hierarchy (project → milestones → tasks).',
    {
      project_id: z.string().uuid().describe('Project ID'),
    },
    async (input) => {
      try {
        const hierarchy = await client.getProjectAttachmentHierarchy(input.project_id);

        const lines: string[] = [];
        lines.push(`Project Attachments (${hierarchy.total_files} total files)`);
        lines.push('');

        // Project level
        if (hierarchy.project.attachments.length > 0) {
          lines.push(`📁 Project (${hierarchy.project.attachments.length} files)`);
          for (const a of hierarchy.project.attachments) {
            lines.push(`   - ${a.display_name} (${formatFileSize(a.size)})`);
          }
          lines.push('');
        }

        // Milestones
        for (const milestone of hierarchy.milestones) {
          const milestoneFiles = milestone.attachments.length +
            milestone.tasks.reduce((sum, t) => sum + t.attachments.length, 0);

          if (milestoneFiles > 0) {
            lines.push(`🎯 ${milestone.name} [${milestone.status}] (${milestoneFiles} files)`);

            for (const a of milestone.attachments) {
              lines.push(`   - ${a.display_name} (${formatFileSize(a.size)})`);
            }

            for (const task of milestone.tasks) {
              if (task.attachments.length > 0) {
                lines.push(`   📋 ${task.title} [${task.status}]`);
                for (const a of task.attachments) {
                  lines.push(`      - ${a.display_name} (${formatFileSize(a.size)})`);
                }
              }
            }
            lines.push('');
          }
        }

        // Unassigned tasks
        if (hierarchy.unassigned_tasks.length > 0) {
          const unassignedFiles = hierarchy.unassigned_tasks.reduce(
            (sum, t) => sum + t.attachments.length, 0
          );

          if (unassignedFiles > 0) {
            lines.push(`📋 Unassigned Tasks (${unassignedFiles} files)`);
            for (const task of hierarchy.unassigned_tasks) {
              if (task.attachments.length > 0) {
                lines.push(`   ${task.title} [${task.status}]`);
                for (const a of task.attachments) {
                  lines.push(`      - ${a.display_name} (${formatFileSize(a.size)})`);
                }
              }
            }
          }
        }

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );

  // Get Storage Usage
  server.tool(
    'get_storage_usage',
    'Get storage usage statistics for your account.',
    {},
    async () => {
      try {
        const usage = await client.getStorageUsage();

        const lines = [
          'Storage Usage',
          '─'.repeat(30),
          `Total Files: ${usage.total_files}`,
          `Total Size: ${usage.total_size_mb.toFixed(2)} MB`,
          `Usage: ${usage.usage_percentage}% of ${usage.storage_limit_mb} MB limit`,
          '',
          'By Entity Type:',
        ];

        for (const [type, count] of Object.entries(usage.by_entity)) {
          lines.push(`  ${type}: ${count} files`);
        }

        if (usage.by_type.length > 0) {
          lines.push('');
          lines.push('By File Type:');
          for (const item of usage.by_type) {
            lines.push(`  ${item.file_type}: ${item.count} files (${formatFileSize(item.total_size)})`);
          }
        }

        return {
          content: [{
            type: 'text',
            text: lines.join('\n'),
          }],
        };
      } catch (error) {
        return { content: formatErrorForMcp(error) };
      }
    }
  );
}
