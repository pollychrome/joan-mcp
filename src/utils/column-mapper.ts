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
  'todo': ['to do', 'todo', 'to-do', 'backlog', 'pending', 'new', 'open', 'ready'],
  'in_progress': ['in progress', 'in_progress', 'in-progress', 'doing', 'wip', 'working', 'active', 'development', 'dev'],
  'review': ['review', 'reviewing', 'code review', 'testing', 'qa', 'test'],
  'deploy': ['deploy', 'deployment', 'deploying', 'staging', 'production'],
  'done': ['done', 'completed', 'complete', 'finished', 'closed', 'resolved'],
  'cancelled': ['cancelled', 'canceled', 'archived', 'removed', 'rejected', 'abandoned'],
  'blocked': ['blocked', 'waiting', 'on hold', 'paused'],
};

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching of column names to handle typos
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find a column that matches the given status by name
 * Uses case-insensitive matching against common column name variations
 * Now includes fuzzy matching with Levenshtein distance
 */
function findColumnByName(columns: ProjectColumn[], status: string): ProjectColumn | null {
  const normalizedStatus = status.toLowerCase().trim();

  // Strategy 1: Exact match (case-insensitive)
  for (const col of columns) {
    if (col.name.toLowerCase().trim() === normalizedStatus) {
      return col;
    }
  }

  // Strategy 2: Pattern match against known aliases
  for (const [_key, aliases] of Object.entries(STATUS_COLUMN_NAMES)) {
    if (aliases.includes(normalizedStatus)) {
      // Found the status in our patterns, now find matching column
      for (const col of columns) {
        if (aliases.includes(col.name.toLowerCase().trim())) {
          return col;
        }
      }
    }
  }

  // Strategy 3: Fuzzy match (Levenshtein distance ≤ 2)
  for (const col of columns) {
    const distance = levenshteinDistance(col.name.toLowerCase().trim(), normalizedStatus);
    if (distance <= 2) {
      console.log(
        `[Joan MCP] Fuzzy matched column '${col.name}' for status '${status}' (distance: ${distance})`
      );
      return col;
    }
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
 * 1. Try to match by column name (case-insensitive, with fuzzy matching)
 * 2. Fall back to position-based inference for 'todo' and 'done'
 * 3. Log warning and optionally throw if no match found
 *
 * @param columns - Project's Kanban columns
 * @param status - Task status ('todo' | 'in_progress' | 'done' | 'cancelled')
 * @param options - Configuration options
 * @param options.required - If true, throw error when column cannot be inferred
 * @returns Matching column or null if no match (when required=false)
 * @throws Error when required=true and no column can be inferred
 */
export function inferColumnFromStatus(
  columns: ProjectColumn[],
  status: string,
  options: { required?: boolean } = {}
): ProjectColumn | null {
  if (columns.length === 0) {
    const error = `[Joan MCP] No columns available for status='${status}'`;
    console.warn(error);
    if (options.required) {
      throw new Error(`Cannot find column for status='${status}'. Project has no columns.`);
    }
    return null;
  }

  // Strategy 1: Match by name (includes exact, pattern, and fuzzy matching)
  const byName = findColumnByName(columns, status);
  if (byName) return byName;

  // Strategy 2: Fall back to position for todo/done
  const byPosition = findColumnByPosition(columns, status);
  if (byPosition) return byPosition;

  // No match found - log warning and optionally throw
  const availableColumns = columns.map(c => c.name).join(', ');
  console.warn(
    `[Joan MCP] Failed to infer column for status='${status}'. ` +
    `Available columns: ${availableColumns}`
  );

  if (options.required) {
    const expectedNames = STATUS_COLUMN_NAMES[status]?.join(', ') || 'unknown';
    throw new Error(
      `Cannot find column for status='${status}'. ` +
      `Expected column names: ${expectedNames}. ` +
      `Available: ${availableColumns}`
    );
  }

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
