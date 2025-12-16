/**
 * Error handling utilities for Joan MCP server
 */

export class JoanApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'JoanApiError';
  }

  static isJoanApiError(error: unknown): error is JoanApiError {
    return error instanceof JoanApiError;
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Format an error for MCP response content
 */
export function formatErrorForMcp(error: unknown): { type: 'text'; text: string }[] {
  if (error instanceof JoanApiError) {
    switch (error.statusCode) {
      case 401:
        return [{
          type: 'text',
          text: 'Authentication failed. Please run "joan-mcp login" to authenticate or check your JOAN_AUTH_TOKEN environment variable.',
        }];
      case 403:
        return [{
          type: 'text',
          text: `Access denied: ${error.message}`,
        }];
      case 404:
        return [{
          type: 'text',
          text: `Resource not found: ${error.message}`,
        }];
      case 422:
        return [{
          type: 'text',
          text: `Validation error: ${error.message}${error.details ? `\nDetails: ${JSON.stringify(error.details, null, 2)}` : ''}`,
        }];
      case 429:
        return [{
          type: 'text',
          text: 'Rate limit exceeded. Please wait before making more requests.',
        }];
      default:
        return [{
          type: 'text',
          text: `API Error (${error.statusCode}): ${error.message}`,
        }];
    }
  }

  if (error instanceof AuthenticationError) {
    return [{
      type: 'text',
      text: `Authentication error: ${error.message}. Run "joan-mcp login" to authenticate.`,
    }];
  }

  if (error instanceof ConfigurationError) {
    return [{
      type: 'text',
      text: `Configuration error: ${error.message}`,
    }];
  }

  if (error instanceof Error) {
    return [{
      type: 'text',
      text: `Error: ${error.message}`,
    }];
  }

  return [{
    type: 'text',
    text: `Unknown error: ${String(error)}`,
  }];
}

/**
 * Wrap an async function to catch errors and format them for MCP
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      // Re-throw so the MCP server can handle it
      throw error;
    }
  };
}
