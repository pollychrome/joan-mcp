/**
 * HTTP client for Joan API
 */

import { JoanApiError } from '../utils/errors.js';
import type {
  Project,
  ProjectWithDetails,
  ProjectColumn,
  ProjectAnalytics,
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
} from './types.js';

export interface JoanApiClientConfig {
  baseUrl: string;
  authToken: string;
}

export class JoanApiClient {
  private baseUrl: string;
  private authToken: string;

  constructor(config: JoanApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.authToken = config.authToken;
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

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
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
    // Get kanban board which contains columns
    const result = await this.request<{ columns: ProjectColumn[] } | ProjectColumn[]>(
      'GET',
      `/tasks/kanban/${projectId}`
    );
    return Array.isArray(result) ? result : (result.columns || []);
  }

  async getProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
    return this.request<ProjectAnalytics>('GET', `/projects/${projectId}/analytics`);
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
}
