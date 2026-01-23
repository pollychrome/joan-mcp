/**
 * Lightweight logger for MCP server output.
 * Uses stderr to avoid polluting stdio transport.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50,
};

function normalizeLevel(value: string | undefined): LogLevel {
  const candidate = (value || '').toLowerCase() as LogLevel;
  return candidate in LEVELS ? candidate : 'info';
}

const minLevel = LEVELS[normalizeLevel(process.env.JOAN_MCP_LOG_LEVEL)];

function isEnabled(level: LogLevel): boolean {
  return LEVELS[level] >= minLevel;
}

function log(level: LogLevel, message: string, ...args: unknown[]): void {
  if (!isEnabled(level)) {
    return;
  }
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [Joan MCP] [${level.toUpperCase()}]`;
  if (args.length > 0) {
    console.error(`${prefix} ${message}`, ...args);
    return;
  }
  console.error(`${prefix} ${message}`);
}

export const logger = {
  debug: (message: string, ...args: unknown[]) => log('debug', message, ...args),
  info: (message: string, ...args: unknown[]) => log('info', message, ...args),
  warn: (message: string, ...args: unknown[]) => log('warn', message, ...args),
  error: (message: string, ...args: unknown[]) => log('error', message, ...args),
  isEnabled,
};
