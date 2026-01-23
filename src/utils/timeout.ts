/**
 * Timeout utilities for HTTP requests
 */

export class TimeoutError extends Error {
  constructor(public readonly timeoutMs: number, message?: string) {
    super(message || `Request timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Fetch with timeout support
 * @param url - URL to fetch
 * @param options - Fetch options plus optional timeoutMs
 * @returns Response
 * @throws TimeoutError if request exceeds timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: { timeoutMs?: number } & RequestInit = {}
): Promise<Response> {
  const { timeoutMs = 10000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(timeoutMs, `Request to ${url} timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Wrap a promise with a timeout.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message?: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(timeoutMs, message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Get default timeout from environment or use 10 seconds
 */
export function getDefaultTimeout(): number {
  return process.env.JOAN_MCP_TIMEOUT_MS
    ? parseInt(process.env.JOAN_MCP_TIMEOUT_MS, 10)
    : 10000; // 10 seconds default for fast API
}
