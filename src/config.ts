/**
 * Configuration management for Joan MCP server
 */

import { z } from 'zod';
import { getAuthToken } from './auth.js';
import { ConfigurationError } from './utils/errors.js';

const ConfigSchema = z.object({
  apiUrl: z.string().url(),
  authToken: z.string().min(1),
});

export type Config = z.infer<typeof ConfigSchema>;

const DEFAULT_API_URL = 'https://joan-api.alexbbenson.workers.dev/api/v1';

/**
 * Load configuration from environment and stored credentials
 */
export async function loadConfig(): Promise<Config> {
  const apiUrl = process.env.JOAN_API_URL || DEFAULT_API_URL;

  let authToken: string;
  try {
    authToken = await getAuthToken();
  } catch (error) {
    throw new ConfigurationError(
      'No authentication token found. Run "joan-mcp login" to authenticate or set JOAN_AUTH_TOKEN environment variable.'
    );
  }

  const config = {
    apiUrl,
    authToken,
  };

  try {
    return ConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new ConfigurationError(`Invalid configuration: ${issues}`);
    }
    throw error;
  }
}

/**
 * Get the API URL (for display purposes, without needing full config)
 */
export function getApiUrl(): string {
  return process.env.JOAN_API_URL || DEFAULT_API_URL;
}

/**
 * Get the base app URL (for login redirects)
 */
export function getAppUrl(): string {
  const apiUrl = getApiUrl();
  // Convert API URL to app URL
  if (apiUrl.includes('joan-api.alexbbenson.workers.dev')) {
    return 'https://joan.nintai.app';
  }
  if (apiUrl.includes('joan-api-staging')) {
    return 'https://staging.joan.nintai.app';
  }
  // Local development
  if (apiUrl.includes('localhost:8787')) {
    return 'http://localhost:5174';
  }
  // Default to production
  return 'https://joan.nintai.app';
}

/**
 * Get the MCP auth URL (for CLI login flow)
 */
export function getMcpAuthUrl(port: number): string {
  const appUrl = getAppUrl();
  return `${appUrl}/mcp-auth?port=${port}`;
}
