/**
 * Auth token management for Joan MCP server
 * Handles storing, retrieving, and validating auth tokens
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdir, readFile, writeFile, unlink, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'node:crypto';
import { AuthenticationError, ConfigurationError } from './utils/errors.js';

const CONFIG_DIR = join(homedir(), '.joan-mcp');
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.json');
const ALGORITHM = 'aes-256-gcm';

interface StoredCredentials {
  token: string;
  iv: string;
  authTag: string;
  email?: string;
  expiresAt?: string;
  createdAt: string;
}

/**
 * Get a machine-specific encryption key
 * Uses a combination of factors to create a stable key
 */
function getMachineKey(): Buffer {
  // Use home directory and username as salt - stable across sessions
  const salt = `${homedir()}-${process.env.USER || process.env.USERNAME || 'joan'}`;
  return scryptSync('joan-mcp-local-encryption', salt, 32);
}

/**
 * Encrypt a token for storage
 */
function encryptToken(token: string): { encrypted: string; iv: string; authTag: string } {
  const key = getMachineKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt a stored token
 */
function decryptToken(encrypted: string, iv: string, authTag: string): string {
  const key = getMachineKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Ensure the config directory exists
 */
async function ensureConfigDir(): Promise<void> {
  try {
    await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Store auth token securely
 */
export async function storeToken(
  token: string,
  email?: string,
  expiresAt?: Date
): Promise<void> {
  await ensureConfigDir();

  const { encrypted, iv, authTag } = encryptToken(token);

  const credentials: StoredCredentials = {
    token: encrypted,
    iv,
    authTag,
    email,
    expiresAt: expiresAt?.toISOString(),
    createdAt: new Date().toISOString(),
  };

  await writeFile(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), 'utf8');
  await chmod(CREDENTIALS_FILE, 0o600); // Owner read/write only
}

/**
 * Retrieve stored auth token
 */
export async function getStoredToken(): Promise<{
  token: string;
  email?: string;
  expiresAt?: Date;
} | null> {
  try {
    const content = await readFile(CREDENTIALS_FILE, 'utf8');
    const credentials: StoredCredentials = JSON.parse(content);

    // Check if token is expired
    if (credentials.expiresAt) {
      const expiresAt = new Date(credentials.expiresAt);
      if (expiresAt < new Date()) {
        // Token expired, remove it
        await clearToken();
        return null;
      }
    }

    const token = decryptToken(credentials.token, credentials.iv, credentials.authTag);

    return {
      token,
      email: credentials.email,
      expiresAt: credentials.expiresAt ? new Date(credentials.expiresAt) : undefined,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Clear stored token
 */
export async function clearToken(): Promise<void> {
  try {
    await unlink(CREDENTIALS_FILE);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Get auth token from stored credentials or environment variable
 */
export async function getAuthToken(): Promise<string> {
  // First, check environment variable
  if (process.env.JOAN_AUTH_TOKEN) {
    return process.env.JOAN_AUTH_TOKEN;
  }

  // Then, check stored credentials
  const stored = await getStoredToken();
  if (stored) {
    return stored.token;
  }

  throw new AuthenticationError(
    'No authentication token found. Run "joan-mcp login" to authenticate or set JOAN_AUTH_TOKEN environment variable.'
  );
}

/**
 * Parse JWT to extract payload (without verification)
 */
export function parseJwt(token: string): { sub?: string; email?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired based on JWT payload
 */
export function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload?.exp) {
    return false; // Assume not expired if no exp claim
  }
  return payload.exp * 1000 < Date.now();
}

/**
 * Start local HTTP server for OAuth callback
 * Returns a promise that resolves with the token when received
 */
export function startCallbackServer(port: number): Promise<{ token: string; email?: string }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || '/', `http://localhost:${port}`);

      if (url.pathname === '/callback') {
        const token = url.searchParams.get('token');
        const email = url.searchParams.get('email');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head><title>Authentication Failed</title></head>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
              <h1 style="color: #dc2626;">Authentication Failed</h1>
              <p>${error}</p>
              <p>You can close this window.</p>
            </body>
            </html>
          `);
          server.close();
          reject(new AuthenticationError(error));
          return;
        }

        if (!token) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
            <head><title>Authentication Failed</title></head>
            <body style="font-family: system-ui; padding: 40px; text-align: center;">
              <h1 style="color: #dc2626;">Authentication Failed</h1>
              <p>No token received.</p>
              <p>You can close this window.</p>
            </body>
            </html>
          `);
          server.close();
          reject(new AuthenticationError('No token received'));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head><title>Authentication Successful</title></head>
          <body style="font-family: system-ui; padding: 40px; text-align: center;">
            <h1 style="color: #16a34a;">Authentication Successful!</h1>
            <p>You are now logged in to Joan MCP.</p>
            <p>You can close this window and return to the terminal.</p>
            <script>setTimeout(() => window.close(), 2000);</script>
          </body>
          </html>
        `);

        server.close();
        resolve({ token, email: email || undefined });
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      }
    });

    server.on('error', reject);

    server.listen(port, 'localhost', () => {
      // Server started
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new AuthenticationError('Authentication timeout - no response received'));
    }, 5 * 60 * 1000);
  });
}

/**
 * Find an available port for the callback server
 */
export async function findAvailablePort(startPort: number = 9876): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(startPort, 'localhost', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : startPort;
      server.close(() => resolve(port));
    });
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        // Try next port
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}
