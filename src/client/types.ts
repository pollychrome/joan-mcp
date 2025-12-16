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

// ============ Tasks ============

export interface Task {
  id: string;
  user_id: string;
  project_id?: string;
  folder_id?: string;
  column_id?: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
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
