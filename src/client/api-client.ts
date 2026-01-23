/**
 * HTTP client for Joan API
 */

import { JoanApiError } from '../utils/errors.js';
import { fetchWithTimeout, getDefaultTimeout } from '../utils/timeout.js';
import type {
  Project,
  ProjectWithDetails,
  ProjectColumn,
  ProjectAnalytics,
  ProjectStatusesResponse,
  ProjectTag,
  CreateProjectTagInput,
  UpdateProjectTagInput,
  CreateColumnInput,
  UpdateColumnInput,
  DeleteColumnResult,
  Task,
  TaskWithSubtasks,
  Goal,
  GoalWithTasks,
  GoalStats,
  Milestone,
  MilestoneWithTasks,
  MilestoneResource,
  Note,
  Comment,
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  CreateGoalInput,
  UpdateGoalInput,
  CreateNoteInput,
  UpdateNoteInput,
  CreateCommentInput,
  UpdateCommentInput,
  ApiListResponse,
  ApiErrorResponse,
  Attachment,
  AttachmentMetadata,
  UpdateAttachmentInput,
  AttachmentDownloadInfo,
  AttachmentHierarchy,
  AttachmentEntityType,
  StorageUsage,
  Resource,
  CreateResourceInput,
  UpdateResourceInput,
  ResourceListResponse,
} from './types.js';

export interface JoanApiClientConfig {
  baseUrl: string;
  authToken: string;
  timeoutMs?: number;
}

export class JoanApiClient {
  private baseUrl: string;
  private authToken: string;
  private timeoutMs: number;

  constructor(config: JoanApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.authToken = config.authToken;
    this.timeoutMs = config.timeoutMs ?? getDefaultTimeout();
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;

    // Add query parameters
    if (queryParams) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json',
    };

    const response = await fetchWithTimeout(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      timeoutMs: this.timeoutMs,
    });

    if (!response.ok) {
      let errorMessage = 'API request failed';
      let errorDetails: unknown;

      try {
        const errorBody = await response.json() as ApiErrorResponse;
        errorMessage = errorBody.error || errorMessage;
        errorDetails = errorBody.details;
      } catch {
        // Ignore JSON parse errors
      }

      throw new JoanApiError(response.status, errorMessage, errorDetails);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  // ============ Projects ============

  async listProjects(params?: {
    status?: string;
    include_members?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Project[]> {
    const result = await this.request<Project[] | ApiListResponse<Project>>(
      'GET',
      '/projects',
      undefined,
      params
    );
    return Array.isArray(result) ? result : (result.items || result.data || []);
  }

  async getProject(id: string): Promise<ProjectWithDetails> {
    return this.request<ProjectWithDetails>('GET', `/projects/${id}`);
  }

  async createProject(data: CreateProjectInput): Promise<Project> {
    return this.request<Project>('POST', '/projects', data);
  }

  async updateProject(id: string, data: UpdateProjectInput): Promise<Project> {
    return this.request<Project>('PATCH', `/projects/${id}`, data);
  }

  async deleteProject(id: string): Promise<void> {
    await this.request<void>('DELETE', `/projects/${id}`);
  }

  async getProjectTasks(projectId: string, params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Task[]> {
    const result = await this.request<Task[] | ApiListResponse<Task>>(
      'GET',
      `/projects/${projectId}/tasks`,
      undefined,
      params
    );
    return Array.isArray(result) ? result : (result.items || result.data || []);
  }

  async getProjectColumns(projectId: string): Promise<ProjectColumn[]> {
    // Fetch columns from project_columns table (the source of truth for kanban structure)
    const result = await this.request<ProjectColumn[]>(
      'GET',
      `/projects/${projectId}/columns`
    );
    return Array.isArray(result) ? result : [];
  }

  async createColumn(projectId: string, data: CreateColumnInput): Promise<ProjectColumn> {
    return this.request<ProjectColumn>('POST', `/projects/${projectId}/columns`, data);
  }

  async updateColumn(
    projectId: string,
    columnId: string,
    data: UpdateColumnInput
  ): Promise<ProjectColumn> {
    return this.request<ProjectColumn>(
      'PATCH',
      `/projects/${projectId}/columns/${columnId}`,
      data
    );
  }

  async deleteColumn(
    projectId: string,
    columnId: string,
    moveTasksTo?: string
  ): Promise<DeleteColumnResult> {
    const queryParams = moveTasksTo ? { move_tasks_to: moveTasksTo } : undefined;
    const result = await this.request<DeleteColumnResult>(
      'DELETE',
      `/projects/${projectId}/columns/${columnId}`,
      undefined,
      queryParams
    );
    return result ?? { deleted: true };
  }

  async reorderColumns(projectId: string, columnOrder: string[]): Promise<ProjectColumn[]> {
    const result = await this.request<ProjectColumn[]>(
      'PUT',
      `/projects/${projectId}/columns/reorder`,
      { column_order: columnOrder }
    );
    return Array.isArray(result) ? result : [];
  }

  async getProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
    return this.request<ProjectAnalytics>('GET', `/projects/${projectId}/analytics`);
  }

  async getProjectStatuses(projectId: string): Promise<ProjectStatusesResponse> {
    return this.request<ProjectStatusesResponse>('GET', `/projects/${projectId}/statuses`);
  }

  // ============ Tasks ============

  async listTasks(params?: {
    project_id?: string;
    status?: string;
    folder_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<Task[]> {
    const result = await this.request<Task[] | ApiListResponse<Task>>(
      'GET',
      '/tasks',
      undefined,
      params
    );
    return Array.isArray(result) ? result : (result.items || result.data || []);
  }

  async getTask(id: string): Promise<Task> {
    return this.request<Task>('GET', `/tasks/${id}`);
  }

  async getTaskWithSubtasks(id: string): Promise<TaskWithSubtasks> {
    return this.request<TaskWithSubtasks>('GET', `/tasks/${id}/with-subtasks`);
  }

  async createTask(data: CreateTaskInput): Promise<Task> {
    return this.request<Task>('POST', '/tasks', data);
  }

  async updateTask(id: string, data: UpdateTaskInput): Promise<Task> {
    return this.request<Task>('PATCH', `/tasks/${id}`, data);
  }

  async deleteTask(id: string): Promise<void> {
    await this.request<void>('DELETE', `/tasks/${id}`);
  }

  async completeTask(id: string): Promise<void> {
    await this.request<void>('POST', `/tasks/${id}/complete`);
  }

  async bulkUpdateTasks(updates: Array<{
    id: string;
    column_id?: string;
    status?: string;
    order_index?: number;
  }>): Promise<{ success: boolean; updated: number }> {
    return this.request<{ success: boolean; updated: number }>(
      'POST',
      '/tasks/batch-reorder',
      { updates }
    );
  }

  // ============ Milestones ============

  async listMilestones(projectId: string, params?: {
    status?: string;
    include_tasks?: boolean;
  }): Promise<Milestone[]> {
    const result = await this.request<Milestone[] | ApiListResponse<Milestone>>(
      'GET',
      `/projects/${projectId}/milestones`,
      undefined,
      params
    );
    return Array.isArray(result) ? result : (result.items || result.data || []);
  }

  async getMilestone(projectId: string, milestoneId: string): Promise<MilestoneWithTasks> {
    return this.request<MilestoneWithTasks>(
      'GET',
      `/projects/${projectId}/milestones/${milestoneId}`
    );
  }

  async createMilestone(projectId: string, data: CreateMilestoneInput): Promise<Milestone> {
    return this.request<Milestone>('POST', `/projects/${projectId}/milestones`, data);
  }

  async updateMilestone(
    projectId: string,
    milestoneId: string,
    data: UpdateMilestoneInput
  ): Promise<Milestone> {
    return this.request<Milestone>(
      'PATCH',
      `/projects/${projectId}/milestones/${milestoneId}`,
      data
    );
  }

  async deleteMilestone(projectId: string, milestoneId: string): Promise<void> {
    await this.request<void>('DELETE', `/projects/${projectId}/milestones/${milestoneId}`);
  }

  async linkTasksToMilestone(
    projectId: string,
    milestoneId: string,
    taskIds: string[]
  ): Promise<void> {
    await this.request<void>(
      'POST',
      `/projects/${projectId}/milestones/${milestoneId}/tasks`,
      { task_ids: taskIds }
    );
  }

  async unlinkTaskFromMilestone(
    projectId: string,
    milestoneId: string,
    taskId: string
  ): Promise<void> {
    await this.request<void>(
      'DELETE',
      `/projects/${projectId}/milestones/${milestoneId}/tasks/${taskId}`
    );
  }

  async getMilestoneResources(projectId: string, milestoneId: string): Promise<MilestoneResource[]> {
    const result = await this.request<MilestoneResource[] | ApiListResponse<MilestoneResource>>(
      'GET',
      `/projects/${projectId}/milestones/${milestoneId}/resources`
    );
    return Array.isArray(result) ? result : (result.items || result.data || []);
  }

  // ============ Goals ============

  async listGoals(params?: {
    type?: string;
    status?: string;
    include_tasks?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Goal[]> {
    const result = await this.request<Goal[] | ApiListResponse<Goal>>(
      'GET',
      '/goals',
      undefined,
      params
    );
    return Array.isArray(result) ? result : (result.items || result.data || []);
  }

  async getGoal(id: string): Promise<GoalWithTasks> {
    return this.request<GoalWithTasks>('GET', `/goals/${id}`);
  }

  async createGoal(data: CreateGoalInput): Promise<Goal> {
    return this.request<Goal>('POST', '/goals', data);
  }

  async updateGoal(id: string, data: UpdateGoalInput): Promise<Goal> {
    return this.request<Goal>('PATCH', `/goals/${id}`, data);
  }

  async deleteGoal(id: string): Promise<void> {
    await this.request<void>('DELETE', `/goals/${id}`);
  }

  async linkTaskToGoal(goalId: string, taskId: string): Promise<void> {
    await this.request<void>('POST', `/goals/${goalId}/tasks`, { task_id: taskId });
  }

  async unlinkTaskFromGoal(goalId: string, taskId: string): Promise<void> {
    await this.request<void>('DELETE', `/goals/${goalId}/tasks/${taskId}`);
  }

  async getGoalStats(id: string): Promise<GoalStats> {
    return this.request<GoalStats>('GET', `/goals/${id}/stats`);
  }

  // ============ Notes ============

  async listNotes(params?: {
    folder_id?: string;
    is_pinned?: boolean;
    is_archived?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Note[]> {
    const result = await this.request<Note[] | ApiListResponse<Note>>(
      'GET',
      '/notes',
      undefined,
      params
    );
    return Array.isArray(result) ? result : (result.items || result.data || []);
  }

  async getNote(id: string): Promise<Note> {
    return this.request<Note>('GET', `/notes/${id}`);
  }

  async createNote(data: CreateNoteInput): Promise<Note> {
    return this.request<Note>('POST', '/notes', data);
  }

  async updateNote(id: string, data: UpdateNoteInput): Promise<Note> {
    return this.request<Note>('PATCH', `/notes/${id}`, data);
  }

  async deleteNote(id: string): Promise<void> {
    await this.request<void>('DELETE', `/notes/${id}`);
  }

  // ============ User/Auth ============

  async getCurrentUser(): Promise<{ id: string; email: string; name?: string }> {
    return this.request<{ id: string; email: string; name?: string }>('GET', '/auth/me');
  }

  // ============ Comments ============

  // Task Comments
  async listTaskComments(taskId: string): Promise<Comment[]> {
    const result = await this.request<Comment[] | ApiListResponse<Comment>>(
      'GET',
      `/tasks/${taskId}/comments`
    );
    return Array.isArray(result) ? result : (result.items || result.data || []);
  }

  async createTaskComment(taskId: string, data: CreateCommentInput): Promise<Comment> {
    return this.request<Comment>('POST', `/tasks/${taskId}/comments`, data);
  }

  async updateTaskComment(
    taskId: string,
    commentId: string,
    data: UpdateCommentInput
  ): Promise<Comment> {
    return this.request<Comment>(
      'PATCH',
      `/tasks/${taskId}/comments/${commentId}`,
      data
    );
  }

  async deleteTaskComment(taskId: string, commentId: string): Promise<void> {
    await this.request<void>('DELETE', `/tasks/${taskId}/comments/${commentId}`);
  }

  // Milestone Comments
  async listMilestoneComments(projectId: string, milestoneId: string): Promise<Comment[]> {
    const result = await this.request<Comment[] | ApiListResponse<Comment>>(
      'GET',
      `/projects/${projectId}/milestones/${milestoneId}/comments`
    );
    return Array.isArray(result) ? result : (result.items || result.data || []);
  }

  async createMilestoneComment(
    projectId: string,
    milestoneId: string,
    data: CreateCommentInput
  ): Promise<Comment> {
    return this.request<Comment>(
      'POST',
      `/projects/${projectId}/milestones/${milestoneId}/comments`,
      data
    );
  }

  async updateMilestoneComment(
    projectId: string,
    milestoneId: string,
    commentId: string,
    data: UpdateCommentInput
  ): Promise<Comment> {
    return this.request<Comment>(
      'PATCH',
      `/projects/${projectId}/milestones/${milestoneId}/comments/${commentId}`,
      data
    );
  }

  async deleteMilestoneComment(
    projectId: string,
    milestoneId: string,
    commentId: string
  ): Promise<void> {
    await this.request<void>(
      'DELETE',
      `/projects/${projectId}/milestones/${milestoneId}/comments/${commentId}`
    );
  }

  // ============ Attachments ============

  /**
   * Upload a file attachment using multipart/form-data
   */
  async uploadAttachment(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    metadata?: AttachmentMetadata
  ): Promise<Attachment> {
    const url = `${this.baseUrl}/attachments/upload`;

    // Create form data manually for Node.js compatibility
    const boundary = `----FormBoundary${Date.now()}`;
    const parts: Buffer[] = [];

    // Add file part
    parts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
    ));
    parts.push(fileBuffer);
    parts.push(Buffer.from('\r\n'));

    // Add metadata part if provided
    if (metadata) {
      parts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="metadata"\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        `${JSON.stringify(metadata)}\r\n`
      ));
    }

    // Add closing boundary
    parts.push(Buffer.from(`--${boundary}--\r\n`));

    const body = Buffer.concat(parts);

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(body.length),
      },
      body,
      timeoutMs: this.timeoutMs,
    });

    if (!response.ok) {
      let errorMessage = 'Upload failed';
      let errorDetails: unknown;

      try {
        const errorBody = await response.json() as ApiErrorResponse;
        errorMessage = errorBody.error || errorMessage;
        errorDetails = errorBody.details;
      } catch {
        // Ignore JSON parse errors
      }

      throw new JoanApiError(response.status, errorMessage, errorDetails);
    }

    return response.json() as Promise<Attachment>;
  }

  /**
   * Get attachment metadata without downloading the file
   */
  async getAttachmentMetadata(id: string): Promise<Attachment> {
    return this.request<Attachment>('GET', `/attachments/${id}/metadata`);
  }

  /**
   * Get download URL information for an attachment
   */
  async getAttachmentDownloadUrl(id: string, expiresIn?: number): Promise<AttachmentDownloadInfo> {
    return this.request<AttachmentDownloadInfo>(
      'GET',
      `/attachments/${id}/download`,
      undefined,
      expiresIn ? { expires: expiresIn } : undefined
    );
  }

  /**
   * Update attachment metadata
   */
  async updateAttachment(id: string, data: UpdateAttachmentInput): Promise<Attachment> {
    return this.request<Attachment>('PATCH', `/attachments/${id}`, data);
  }

  /**
   * Delete an attachment
   */
  async deleteAttachment(id: string): Promise<void> {
    await this.request<void>('DELETE', `/attachments/${id}`);
  }

  /**
   * List attachments for a specific entity
   */
  async listAttachmentsByEntity(
    entityType: AttachmentEntityType,
    entityId: string
  ): Promise<Attachment[]> {
    const result = await this.request<Attachment[] | ApiListResponse<Attachment>>(
      'GET',
      `/attachments/entity/${entityType}/${entityId}`
    );
    return Array.isArray(result) ? result : (result.items || result.data || []);
  }

  /**
   * Get all attachments organized by project hierarchy
   */
  async getProjectAttachmentHierarchy(projectId: string): Promise<AttachmentHierarchy> {
    return this.request<AttachmentHierarchy>('GET', `/attachments/project/${projectId}/hierarchy`);
  }

  /**
   * Get storage usage statistics
   */
  async getStorageUsage(): Promise<StorageUsage> {
    return this.request<StorageUsage>('GET', '/attachments/usage');
  }

  // ============ Task Resources ============

  async listTaskResources(taskId: string, type?: string): Promise<Resource[]> {
    const result = await this.request<ResourceListResponse | Resource[]>(
      'GET',
      `/tasks/${taskId}/resources`,
      undefined,
      type ? { type } : undefined
    );
    if (Array.isArray(result)) {
      return result;
    }
    return result.resources || [];
  }

  async getTaskResource(taskId: string, resourceId: string): Promise<Resource> {
    return this.request<Resource>('GET', `/tasks/${taskId}/resources/${resourceId}`);
  }

  async createTaskResource(taskId: string, data: CreateResourceInput): Promise<Resource> {
    return this.request<Resource>('POST', `/tasks/${taskId}/resources`, data);
  }

  async updateTaskResource(
    taskId: string,
    resourceId: string,
    data: UpdateResourceInput
  ): Promise<Resource> {
    return this.request<Resource>(
      'PATCH',
      `/tasks/${taskId}/resources/${resourceId}`,
      data
    );
  }

  async deleteTaskResource(taskId: string, resourceId: string): Promise<void> {
    await this.request<void>('DELETE', `/tasks/${taskId}/resources/${resourceId}`);
  }

  // ============ Project Resources ============

  async listProjectResources(projectId: string): Promise<Resource[]> {
    const result = await this.request<ResourceListResponse | Resource[]>(
      'GET',
      `/projects/${projectId}/resources`
    );
    if (Array.isArray(result)) {
      return result;
    }
    return result.resources || [];
  }

  async createProjectResource(projectId: string, data: CreateResourceInput): Promise<Resource> {
    return this.request<Resource>('POST', `/projects/${projectId}/resources`, data);
  }

  async updateProjectResource(
    projectId: string,
    resourceId: string,
    data: UpdateResourceInput
  ): Promise<Resource> {
    return this.request<Resource>(
      'PATCH',
      `/projects/${projectId}/resources/${resourceId}`,
      data
    );
  }

  async deleteProjectResource(projectId: string, resourceId: string): Promise<void> {
    await this.request<void>('DELETE', `/projects/${projectId}/resources/${resourceId}`);
  }

  // ============ Milestone Resources ============

  async listMilestoneResources(projectId: string, milestoneId: string): Promise<Resource[]> {
    const result = await this.request<ResourceListResponse | Resource[]>(
      'GET',
      `/projects/${projectId}/milestones/${milestoneId}/resources`
    );
    if (Array.isArray(result)) {
      return result;
    }
    return result.resources || [];
  }

  async createMilestoneResource(
    projectId: string,
    milestoneId: string,
    data: CreateResourceInput
  ): Promise<Resource> {
    return this.request<Resource>(
      'POST',
      `/projects/${projectId}/milestones/${milestoneId}/resources`,
      data
    );
  }

  async updateMilestoneResource(
    projectId: string,
    milestoneId: string,
    resourceId: string,
    data: UpdateResourceInput
  ): Promise<Resource> {
    return this.request<Resource>(
      'PATCH',
      `/projects/${projectId}/milestones/${milestoneId}/resources/${resourceId}`,
      data
    );
  }

  async deleteMilestoneResource(
    projectId: string,
    milestoneId: string,
    resourceId: string
  ): Promise<void> {
    await this.request<void>(
      'DELETE',
      `/projects/${projectId}/milestones/${milestoneId}/resources/${resourceId}`
    );
  }

  // ============ Project Tags ============

  /**
   * List all tags for a project
   */
  async listProjectTags(projectId: string): Promise<ProjectTag[]> {
    const result = await this.request<ProjectTag[] | ApiListResponse<ProjectTag>>(
      'GET',
      `/projects/${projectId}/tags`
    );
    return Array.isArray(result) ? result : (result.items || result.data || []);
  }

  /**
   * Get a single project tag by ID
   */
  async getProjectTag(projectId: string, tagId: string): Promise<ProjectTag> {
    return this.request<ProjectTag>('GET', `/projects/${projectId}/tags/${tagId}`);
  }

  /**
   * Create a new tag for a project
   */
  async createProjectTag(projectId: string, data: CreateProjectTagInput): Promise<ProjectTag> {
    return this.request<ProjectTag>('POST', `/projects/${projectId}/tags`, data);
  }

  /**
   * Update a project tag
   */
  async updateProjectTag(
    projectId: string,
    tagId: string,
    data: UpdateProjectTagInput
  ): Promise<ProjectTag> {
    return this.request<ProjectTag>(
      'PATCH',
      `/projects/${projectId}/tags/${tagId}`,
      data
    );
  }

  /**
   * Delete a project tag (also removes from all tasks)
   */
  async deleteProjectTag(projectId: string, tagId: string): Promise<void> {
    await this.request<void>('DELETE', `/projects/${projectId}/tags/${tagId}`);
  }

  // ============ Task Tag Assignments ============

  /**
   * Get all tags assigned to a task
   */
  async getTaskTags(projectId: string, taskId: string): Promise<ProjectTag[]> {
    const result = await this.request<ProjectTag[] | ApiListResponse<ProjectTag>>(
      'GET',
      `/projects/${projectId}/tasks/${taskId}/tags`
    );
    return Array.isArray(result) ? result : (result.items || result.data || []);
  }

  /**
   * Add a tag to a task
   */
  async addTagToTask(projectId: string, taskId: string, tagId: string): Promise<void> {
    await this.request<void>(
      'POST',
      `/projects/${projectId}/tasks/${taskId}/tags/${tagId}`
    );
  }

  /**
   * Remove a tag from a task
   */
  async removeTagFromTask(projectId: string, taskId: string, tagId: string): Promise<void> {
    await this.request<void>(
      'DELETE',
      `/projects/${projectId}/tasks/${taskId}/tags/${tagId}`
    );
  }

  /**
   * Bulk update tags for a task (replaces all existing tags)
   */
  async setTaskTags(projectId: string, taskId: string, tagIds: string[]): Promise<ProjectTag[]> {
    return this.request<ProjectTag[]>(
      'PUT',
      `/projects/${projectId}/tasks/${taskId}/tags`,
      { tag_ids: tagIds }
    );
  }
}
