/**
 * Telemetry and monitoring for column synchronization operations
 *
 * Tracks column sync events to identify patterns, failures, and edge cases
 * that require attention or configuration updates.
 */

import { logger } from './logger.js';

export interface ColumnSyncEvent {
  task_id: string;
  task_number: number;
  operation: 'complete' | 'update' | 'bulk_update';
  status_before: string;
  status_after: string;
  column_before: string;
  column_after: string;
  inferred: boolean;
  inference_failed: boolean;
  timestamp: string;
}

/**
 * Telemetry collector for column synchronization events
 *
 * Usage:
 *   const telemetry = new ColumnSyncTelemetry();
 *
 *   telemetry.log({
 *     task_id: 'abc',
 *     task_number: 123,
 *     operation: 'complete',
 *     status_before: 'in_progress',
 *     status_after: 'done',
 *     column_before: 'Development',
 *     column_after: 'Done',
 *     inferred: true,
 *     inference_failed: false
 *   });
 *
 *   // Later, analyze failures
 *   const failures = telemetry.getFailures();
 *   const metrics = telemetry.getMetrics();
 */
export class ColumnSyncTelemetry {
  private events: ColumnSyncEvent[] = [];

  /**
   * Log a column sync event
   * Automatically adds timestamp and logs to console
   */
  log(event: Omit<ColumnSyncEvent, 'timestamp'>): void {
    const fullEvent: ColumnSyncEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.events.push(fullEvent);

    // Log to console based on event type
    if (event.inference_failed) {
      logger.error(
        `[Joan MCP] Column sync failed for task #${event.task_number}: ` +
        `status=${event.status_after}, column=${event.column_before}`
      );
    } else if (event.inferred) {
      logger.info(
        `[Joan MCP] Column synced for task #${event.task_number}: ` +
        `${event.column_before} → ${event.column_after}`
      );
    }
  }

  /**
   * Get all events where column inference failed
   * Useful for identifying configuration issues or missing column mappings
   */
  getFailures(): ColumnSyncEvent[] {
    return this.events.filter(e => e.inference_failed);
  }

  /**
   * Get aggregated metrics about column sync operations
   * Returns success rate, failure count, and other key metrics
   */
  getMetrics() {
    const total = this.events.length;
    const failures = this.events.filter(e => e.inference_failed).length;
    const inferredSyncs = this.events.filter(e => e.inferred).length;

    return {
      total_events: total,
      failures: failures,
      inferred_syncs: inferredSyncs,
      failure_rate: total > 0 ? failures / total : 0,
      success_rate: total > 0 ? (total - failures) / total : 0,
    };
  }

  /**
   * Get all events (for debugging or export)
   */
  getAllEvents(): ColumnSyncEvent[] {
    return [...this.events];
  }

  /**
   * Clear all events
   * Useful for resetting telemetry between test runs
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Get events grouped by operation type
   */
  getEventsByOperation(): Record<string, ColumnSyncEvent[]> {
    return this.events.reduce((acc, event) => {
      if (!acc[event.operation]) {
        acc[event.operation] = [];
      }
      acc[event.operation].push(event);
      return acc;
    }, {} as Record<string, ColumnSyncEvent[]>);
  }

  /**
   * Get recent failures (last N events that failed)
   */
  getRecentFailures(limit: number = 10): ColumnSyncEvent[] {
    return this.events
      .filter(e => e.inference_failed)
      .slice(-limit);
  }
}

/**
 * Global telemetry instance
 * Import and use this for tracking column sync events across the application
 */
export const globalColumnSyncTelemetry = new ColumnSyncTelemetry();
