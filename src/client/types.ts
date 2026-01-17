/**
 * Type definitions for Joan API responses
 */

// ============ Projects ============

export interface Project {
  id: string;
  user_id: string;
  client_id?: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  start_date?: string;
  end_date?: string;
  budget?: number;
  hourly_rate?: number;
  estimated_hours?: number;
  actual_hours?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithDetails extends Project {
  members?: ProjectMember[];
  task_stats?: {
    total: number;
    completed: number;
    in_progress: number;
    pending: number;
  };
  recent_activity?: ActivityItem[];
}

export interface ProjectMember {
  id: string;
  user_id: string;
  project_id: string;
  role: 'owner' | 'admin' | 'contributor' | 'read_only';
  name?: string;
  email?: string;
  joined_at: string;
}

export interface ProjectColumn {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  color: string;
  position: number;
  wip_limit?: number;
  is_default: boolean;
  status_key?: string; // Custom status key for API/MCP compatibility
  task_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateColumnInput {
  name: string;
  position?: number;
  default_status?: string;
  color?: string;
}

export interface UpdateColumnInput {
  name?: string;
  default_status?: string;
  color?: string;
}

export interface DeleteColumnResult {
  deleted: true;
  tasks_moved?: number;
}

export interface ProjectAnalytics {
  burndown?: {
    dates: string[];
    remaining: number[];
    ideal: number[];
  };
  velocity?: {
    completed_this_week: number;
    average_weekly: number;
  };
  weekly_activity?: {
    week: string;
    tasks_created: number;
    tasks_completed: number;
  }[];
}

export interface ProjectStatus {
  key: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
  column_id?: string;
}

export interface ProjectStatusesResponse {
  statuses: ProjectStatus[];
  custom: boolean; // true if project has custom statuses, false if using defaults
}

// ============ Tasks ============

export interface Task {
  id: string;
  user_id: string;
  project_id?: string;
  folder_id?: string;
  column_id?: string;
  title: string;
  description?: string;
  status: string; // Now supports custom statuses per project
  priority: number; // 0-3
  due_date?: string;
  estimated_minutes?: number;
  actual_minutes?: number;
  kanban_position?: number;
  assignee_id?: string;
  assignee_name?: string;
  task_number?: number;
  milestone_id?: string;
  milestone_name?: string;
  tags?: string[];
  resources?: TaskResource[];
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskResource {
  id: string;
  title: string;
  description?: string;
  type: 'article' | 'video' | 'book' | 'tool' | 'tip' | 'plan' | 'workout' | 'guide' | 'generated';
  url?: string;
  content?: string;
  source?: string;
  duration?: number;
}

export interface TaskWithSubtasks extends Task {
  subtasks?: Task[];
}

// ============ Goals ============

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'standard';
  status: 'active' | 'paused' | 'completed' | 'archived';
  target_date?: string;
  progress: number; // 0-100
  metrics?: Record<string, unknown>;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GoalWithTasks extends Goal {
  linked_tasks?: Task[];
}

export interface GoalStats {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  pending_tasks: number;
  completion_rate: number;
}

// ============ Milestones ============

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  target_date?: string;
  status: 'upcoming' | 'in_progress' | 'completed' | 'missed';
  progress: number; // 0-100
  completed_at?: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface MilestoneWithTasks extends Milestone {
  tasks?: Task[];
  task_count: number;
  completed_task_count: number;
}

export interface MilestoneResource {
  id: string;
  milestone_id: string;
  type: 'link' | 'note';
  title: string;
  url?: string;
  content?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ============ Notes ============

export interface Note {
  id: string;
  user_id: string;
  folder_id?: string;
  title: string;
  content?: string;
  content_html?: string;
  tags?: string[];
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Activity ============

export interface ActivityItem {
  id: string;
  user_id: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: Record<string, unknown>;
  created_at: string;
}

// ============ Input Types ============

export interface CreateProjectInput {
  name: string;
  description?: string;
  status?: Project['status'];
  start_date?: string;
  end_date?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: Project['status'];
  start_date?: string;
  end_date?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  project_id?: string;
  column_id?: string;
  status?: string;
  priority?: number;
  due_date?: string;
  estimated_minutes?: number;
  assignee_id?: string;
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  column_id?: string;
  status?: string;
  priority?: number;
  due_date?: string;
  estimated_minutes?: number;
  assignee_id?: string;
  tags?: string[];
}

export interface CreateMilestoneInput {
  name: string;
  description?: string;
  target_date?: string;
  status?: Milestone['status'];
}

export interface UpdateMilestoneInput {
  name?: string;
  description?: string;
  target_date?: string;
  status?: Milestone['status'];
  progress?: number;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  type?: Goal['type'];
  target_date?: string;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  status?: Goal['status'];
  target_date?: string;
  progress?: number;
}

export interface CreateNoteInput {
  title: string;
  content?: string;
  folder_id?: string;
  tags?: string[];
  is_pinned?: boolean;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  folder_id?: string;
  tags?: string[];
  is_pinned?: boolean;
  is_archived?: boolean;
}

// ============ API Response Types ============

export interface ApiListResponse<T> {
  items?: T[];
  data?: T[];
  total?: number;
  limit?: number;
  offset?: number;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

// ============ Comments ============

export interface Comment {
  id: string;
  entity_type: 'task' | 'milestone';
  entity_id: string;
  user_id: string;
  user_name?: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCommentInput {
  content: string;
}

export interface UpdateCommentInput {
  content: string;
}

// ============ Attachments ============

export type AttachmentCategory =
  | 'document'
  | 'image'
  | 'video'
  | 'audio'
  | 'archive'
  | 'code'
  | 'other';

export type AttachmentEntityType =
  | 'project'
  | 'milestone'
  | 'task'
  | 'note'
  | 'folder'
  | 'user';

export interface Attachment {
  id: string;
  user_id: string;
  filename: string;
  display_name: string;
  description: string | null;
  mime_type: string;
  size: number;
  file_extension: string | null;
  storage_key: string;
  category: AttachmentCategory;
  tags: string[] | null;
  entity_type: AttachmentEntityType | null;
  entity_id: string | null;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
  url: string;
}

export interface AttachmentMetadata {
  entity_type?: AttachmentEntityType;
  entity_id?: string;
  display_name?: string;
  description?: string;
  category?: AttachmentCategory;
  tags?: string[];
}

export interface UpdateAttachmentInput {
  display_name?: string;
  description?: string;
  category?: AttachmentCategory;
  tags?: string[];
}

export interface AttachmentDownloadInfo {
  download_url: string;
  filename: string;
  display_name: string;
  mime_type: string;
  file_size: number;
  expires_at: string;
}

export interface AttachmentHierarchy {
  project: {
    id: string;
    attachments: Attachment[];
  };
  milestones: {
    id: string;
    name: string;
    status: string;
    attachments: Attachment[];
    tasks: {
      id: string;
      title: string;
      status: string;
      attachments: Attachment[];
    }[];
  }[];
  unassigned_tasks: {
    id: string;
    title: string;
    status: string;
    attachments: Attachment[];
  }[];
  total_files: number;
}

export interface StorageUsage {
  total_files: number;
  total_size_bytes: number;
  total_size_mb: number;
  by_entity: Record<string, number>;
  by_type: {
    file_type: string;
    count: number;
    total_size: number;
  }[];
  storage_limit_mb: number;
  usage_percentage: number;
}

// ============ Resources (Links/Notes) ============

export type ResourceType =
  | 'link'
  | 'note'
  | 'article'
  | 'video'
  | 'book'
  | 'tool'
  | 'guide';

export interface Resource {
  id: string;
  task_id?: string;
  project_id?: string;
  milestone_id?: string;
  type: ResourceType;
  title: string | null;
  url: string | null;
  content: string | null;
  description: string | null;
  source: string | null;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateResourceInput {
  type: ResourceType;
  title?: string;
  url?: string;
  content?: string;
  description?: string;
  source?: string;
}

export interface UpdateResourceInput {
  title?: string;
  url?: string;
  content?: string;
  description?: string;
  source?: string;
}

export interface ResourceListResponse {
  resources: Resource[];
  total: number;
}

// ============ Project Tags ============

export interface ProjectTag {
  id: string;
  project_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectTagInput {
  name: string;
  color?: string; // Hex color, defaults to '#6B7280' (gray)
}

export interface UpdateProjectTagInput {
  name?: string;
  color?: string;
}
