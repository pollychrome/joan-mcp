/**
 * Utility functions for mapping task statuses to Kanban columns
 *
 * Joan uses two parallel systems:
 * - Status: 'todo' | 'in_progress' | 'done' | 'cancelled' (MCP/frontend)
 * - Column: Kanban board columns with custom names per project
 *
 * This utility helps keep them synchronized.
 */

import type { ProjectColumn } from '../client/types.js';

/**
 * Common column name variations for each status
 * Used for case-insensitive matching against project columns
 */
const STATUS_COLUMN_NAMES: Record<string, string[]> = {
  'todo': ['to do', 'todo', 'to-do', 'backlog', 'pending', 'new'],
  'in_progress': ['in progress', 'in_progress', 'in-progress', 'doing', 'wip', 'working', 'active'],
  'done': ['done', 'completed', 'complete', 'finished', 'closed'],
  'cancelled': ['cancelled', 'canceled', 'archived', 'removed'],
};

/**
 * Find a column that matches the given status by name
 * Uses case-insensitive matching against common column name variations
 */
function findColumnByName(columns: ProjectColumn[], status: string): ProjectColumn | null {
  const targetNames = STATUS_COLUMN_NAMES[status] || [];

  for (const targetName of targetNames) {
    const match = columns.find(col =>
      col.name.toLowerCase().trim() === targetName.toLowerCase()
    );
    if (match) return match;
  }

  return null;
}

/**
 * Find a column by position (fallback strategy)
 * - 'todo': First column (position 0)
 * - 'done': Last column (highest position)
 * - Others: No position-based fallback
 */
function findColumnByPosition(columns: ProjectColumn[], status: string): ProjectColumn | null {
  if (columns.length === 0) return null;

  const sorted = [...columns].sort((a, b) => a.position - b.position);

  if (status === 'todo') {
    return sorted[0];
  }

  if (status === 'done') {
    return sorted[sorted.length - 1];
  }

  return null;
}

/**
 * Find the default column for a project
 * Returns the column marked as is_default, or first column if none marked
 */
export function findDefaultColumn(columns: ProjectColumn[]): ProjectColumn | null {
  if (columns.length === 0) return null;

  const defaultCol = columns.find(col => col.is_default);
  if (defaultCol) return defaultCol;

  // Fall back to first column by position
  const sorted = [...columns].sort((a, b) => a.position - b.position);
  return sorted[0];
}

/**
 * Infer the appropriate column for a given status
 *
 * Strategy:
 * 1. Try to match by column name (case-insensitive)
 * 2. Fall back to position-based inference for 'todo' and 'done'
 * 3. Return null if no suitable column found
 *
 * @param columns - Project's Kanban columns
 * @param status - Task status ('todo' | 'in_progress' | 'done' | 'cancelled')
 * @returns Matching column or null if no match
 */
export function inferColumnFromStatus(
  columns: ProjectColumn[],
  status: string
): ProjectColumn | null {
  if (columns.length === 0) return null;

  // Strategy 1: Match by name
  const byName = findColumnByName(columns, status);
  if (byName) return byName;

  // Strategy 2: Fall back to position for todo/done
  const byPosition = findColumnByPosition(columns, status);
  if (byPosition) return byPosition;

  return null;
}

/**
 * Get the column ID for a given status, if one can be inferred
 * Convenience wrapper around inferColumnFromStatus
 */
export function getColumnIdForStatus(
  columns: ProjectColumn[],
  status: string
): string | null {
  const column = inferColumnFromStatus(columns, status);
  return column?.id ?? null;
}

/**
 * Check if a column appears to be a "done" column
 * Useful for determining if column sync is needed after complete_task
 */
export function isDoneColumn(column: ProjectColumn): boolean {
  const doneNames = STATUS_COLUMN_NAMES['done'] || [];
  return doneNames.some(name =>
    column.name.toLowerCase().trim() === name.toLowerCase()
  );
}

/**
 * Format columns for display in MCP tool responses
 */
export function formatColumnsForDisplay(columns: ProjectColumn[]): string {
  if (columns.length === 0) {
    return 'No columns found.';
  }

  const sorted = [...columns].sort((a, b) => a.position - b.position);

  const lines = sorted.map(col => {
    let info = `- ${col.name} (ID: ${col.id})`;
    if (col.is_default) info += ' [default]';
    if (col.wip_limit) info += ` [WIP: ${col.wip_limit}]`;
    return info;
  });

  return `Found ${columns.length} column(s):\n\n${lines.join('\n')}`;
}
