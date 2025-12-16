/**
 * Data format converters between Joan frontend/API and MCP server
 */

// Status conversions (frontend format <-> backend format)
const STATUS_TO_BACKEND: Record<string, string> = {
  'todo': 'pending',
  'in_progress': 'in_progress',
  'done': 'completed',
  'cancelled': 'cancelled',
};

const STATUS_TO_FRONTEND: Record<string, string> = {
  'pending': 'todo',
  'in_progress': 'in_progress',
  'completed': 'done',
  'cancelled': 'cancelled',
};

export function statusToBackend(status: string): string {
  return STATUS_TO_BACKEND[status] || 'pending';
}

export function statusToFrontend(status: string): string {
  return STATUS_TO_FRONTEND[status] || 'todo';
}

// Priority conversions (string <-> number)
const PRIORITY_TO_NUMBER: Record<string, number> = {
  'none': 0,
  'low': 1,
  'medium': 2,
  'high': 3,
};

const PRIORITY_TO_STRING: Record<number, string> = {
  0: 'none',
  1: 'low',
  2: 'medium',
  3: 'high',
};

export function priorityToNumber(priority: string): number {
  return PRIORITY_TO_NUMBER[priority] ?? 0;
}

export function priorityToString(priority: number): string {
  return PRIORITY_TO_STRING[priority] ?? 'none';
}

// Time conversions (pomodoros are 25-minute units)
const POMODORO_MINUTES = 25;

export function pomodorosToMinutes(pomodoros: number): number {
  return pomodoros * POMODORO_MINUTES;
}

export function minutesToPomodoros(minutes: number): number {
  return Math.round(minutes / POMODORO_MINUTES);
}

// Convert task from API format to user-friendly format
export interface ApiTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: number;
  due_date?: string;
  estimated_minutes?: number;
  actual_minutes?: number;
  project_id?: string;
  column_id?: string;
  assignee_id?: string;
  assignee_name?: string;
  task_number?: number;
  milestone_id?: string;
  milestone_name?: string;
  tags?: string[];
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FormattedTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  estimated_pomodoros?: number;
  actual_pomodoros?: number;
  project_id?: string;
  column_id?: string;
  assignee_id?: string;
  assignee_name?: string;
  task_number?: number;
  milestone_id?: string;
  milestone_name?: string;
  tags?: string[];
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export function formatTask(task: ApiTask): FormattedTask {
  return {
    ...task,
    status: statusToFrontend(task.status),
    priority: priorityToString(task.priority),
    estimated_pomodoros: task.estimated_minutes
      ? minutesToPomodoros(task.estimated_minutes)
      : undefined,
    actual_pomodoros: task.actual_minutes
      ? minutesToPomodoros(task.actual_minutes)
      : undefined,
  };
}

// Convert task input from user format to API format
export interface TaskInput {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  estimated_pomodoros?: number;
  project_id?: string;
  column_id?: string;
  assignee_id?: string;
  tags?: string[];
}

export interface ApiTaskInput {
  title: string;
  description?: string;
  status?: string;
  priority?: number;
  due_date?: string;
  estimated_minutes?: number;
  project_id?: string;
  column_id?: string;
  assignee_id?: string;
  tags?: string[];
}

export function formatTaskInput(input: TaskInput): ApiTaskInput {
  return {
    title: input.title,
    description: input.description,
    status: input.status ? statusToBackend(input.status) : undefined,
    priority: input.priority ? priorityToNumber(input.priority) : undefined,
    due_date: input.due_date,
    estimated_minutes: input.estimated_pomodoros
      ? pomodorosToMinutes(input.estimated_pomodoros)
      : undefined,
    project_id: input.project_id,
    column_id: input.column_id,
    assignee_id: input.assignee_id,
    tags: input.tags,
  };
}
