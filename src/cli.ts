#!/usr/bin/env node
/**
 * CLI for Joan MCP server
 * Commands: login, logout, status, serve (default)
 */

import { spawn } from 'node:child_process';
import {
  getStoredToken,
  storeToken,
  clearToken,
  findAvailablePort,
  startCallbackServer,
  parseJwt,
  isTokenExpired,
} from './auth.js';
import { getApiUrl, getMcpAuthUrl, loadConfig } from './config.js';
import { JoanApiClient } from './client/api-client.js';
import { startServer } from './index.js';

const HELP_TEXT = `
Joan MCP Server - AI assistant integration for Joan productivity app

Usage: joan-mcp <command>

Commands:
  init      Set up Joan MCP (login + configure Claude Code)
  serve     Start the MCP server (default)
  login     Authenticate with Joan
  logout    Clear stored credentials
  status    Show current authentication status
  help      Show this help message

Examples:
  joan-mcp init       # First-time setup (recommended)
  joan-mcp login      # Opens browser to authenticate
  joan-mcp status     # Shows if logged in
  joan-mcp serve      # Start MCP server
  joan-mcp            # Same as 'joan-mcp serve'

Quick Start (after npm install -g @pollychrome/joan-mcp):
  1. joan-mcp init     # Authenticate and configure Claude Code
  2. Restart Claude Code
  3. Ask Claude: "Show me my Joan projects"

Environment Variables:
  JOAN_AUTH_TOKEN   JWT token for authentication (alternative to login)
  JOAN_API_URL      API base URL (default: production)
`;

/**
 * Open a URL in the default browser
 */
async function openBrowser(url: string): Promise<void> {
  const platform = process.platform;
  let command: string;
  let args: string[];

  switch (platform) {
    case 'darwin':
      command = 'open';
      args = [url];
      break;
    case 'win32':
      command = 'cmd';
      args = ['/c', 'start', url];
      break;
    default:
      // Linux and others
      command = 'xdg-open';
      args = [url];
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    child.on('error', reject);
    // Give it a moment to start
    setTimeout(resolve, 500);
  });
}

/**
 * Login command - opens browser for authentication
 */
async function login(): Promise<void> {
  console.log('Starting authentication flow...');

  // Check if already logged in
  const existing = await getStoredToken();
  if (existing && !isTokenExpired(existing.token)) {
    console.log(`Already logged in as ${existing.email || 'unknown user'}`);
    console.log('Run "joan-mcp logout" first to login with a different account.');
    return;
  }

  // Find available port for callback
  const port = await findAvailablePort();
  console.log(`Callback server listening on port ${port}`);

  // Start callback server
  const callbackPromise = startCallbackServer(port);

  // Open browser to MCP auth page
  const loginUrl = getMcpAuthUrl(port);

  console.log(`Opening browser to: ${loginUrl}`);
  console.log('If the browser does not open, please visit the URL manually.');

  try {
    await openBrowser(loginUrl);
  } catch (error) {
    console.log('Could not open browser automatically.');
    console.log(`Please visit: ${loginUrl}`);
  }

  console.log('\nWaiting for authentication...');

  try {
    const { token, email } = await callbackPromise;

    // Parse JWT to get expiration
    const payload = parseJwt(token);
    const expiresAt = payload?.exp ? new Date(payload.exp * 1000) : undefined;

    // Store the token
    await storeToken(token, email, expiresAt);

    console.log('\n✓ Authentication successful!');
    console.log(`  Logged in as: ${email || 'unknown'}`);
    if (expiresAt) {
      console.log(`  Token expires: ${expiresAt.toLocaleDateString()}`);
    }
    console.log('\nYou can now use joan-mcp with Claude Code or other MCP clients.');
  } catch (error) {
    console.error('\n✗ Authentication failed:', (error as Error).message);
    process.exit(1);
  }
}

/**
 * Logout command - clear stored credentials
 */
async function logout(): Promise<void> {
  await clearToken();
  console.log('Logged out. Stored credentials have been cleared.');
}

/**
 * Status command - show current auth status
 */
async function status(): Promise<void> {
  // Check environment variable first
  if (process.env.JOAN_AUTH_TOKEN) {
    console.log('Authentication: Using JOAN_AUTH_TOKEN environment variable');
    const payload = parseJwt(process.env.JOAN_AUTH_TOKEN);
    if (payload) {
      console.log(`  Email: ${payload.sub || payload.email || 'unknown'}`);
      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000);
        const isExpired = expDate < new Date();
        console.log(`  Expires: ${expDate.toLocaleDateString()} ${isExpired ? '(EXPIRED)' : ''}`);
      }
    }
    console.log(`\nAPI URL: ${getApiUrl()}`);
    return;
  }

  // Check stored token
  const stored = await getStoredToken();
  if (!stored) {
    console.log('Not logged in.');
    console.log('Run "joan-mcp login" to authenticate.');
    return;
  }

  const isExpired = isTokenExpired(stored.token);
  console.log(`Authentication: Logged in${isExpired ? ' (EXPIRED)' : ''}`);
  console.log(`  Email: ${stored.email || 'unknown'}`);
  if (stored.expiresAt) {
    console.log(`  Expires: ${stored.expiresAt.toLocaleDateString()}`);
  }
  console.log(`\nAPI URL: ${getApiUrl()}`);

  // Verify token by calling API
  if (!isExpired) {
    try {
      const config = await loadConfig();
      const client = new JoanApiClient({
        baseUrl: config.apiUrl,
        authToken: config.authToken,
      });
      const user = await client.getCurrentUser();
      console.log(`\n✓ Token verified with API`);
      console.log(`  User ID: ${user.id}`);
      console.log(`  Name: ${user.name || 'N/A'}`);
    } catch (error) {
      console.log(`\n⚠ Could not verify token with API: ${(error as Error).message}`);
    }
  }
}

/**
 * Serve command - start MCP server
 */
async function serve(): Promise<void> {
  // This is handled by index.ts
  await startServer();
}

/**
 * Configure Claude Code to use Joan MCP using the claude CLI
 *
 * Uses npx for cross-platform compatibility and automatic package resolution.
 * This follows MCP server distribution best practices as documented at:
 * - https://modelcontextprotocol.io/docs/concepts/architecture
 * - https://code.claude.com/docs/en/mcp
 */
async function configureClaudeCode(): Promise<boolean> {
  const { execSync, spawnSync } = await import('node:child_process');

  // Platform-aware command construction
  // Windows requires cmd /c wrapper for npx execution
  // See: https://code.claude.com/docs/en/mcp (Windows-specific requirements)
  const isWindows = process.platform === 'win32';
  const mcpCommand = isWindows
    ? ['mcp', 'add', 'joan', '-s', 'user', '--', 'cmd', '/c', 'npx', '-y', '@pollychrome/joan-mcp', 'serve']
    : ['mcp', 'add', 'joan', '-s', 'user', '--', 'npx', '-y', '@pollychrome/joan-mcp', 'serve'];

  const manualCommand = isWindows
    ? 'claude mcp add joan -s user -- cmd /c npx -y @pollychrome/joan-mcp serve'
    : 'claude mcp add joan -s user -- npx -y @pollychrome/joan-mcp serve';

  // Check if Claude CLI is available
  try {
    execSync('claude --version', { stdio: 'pipe' });
  } catch {
    console.log('\n⚠ Claude CLI not found.');
    console.log('\nManual configuration required:');
    console.log(`  Run: ${manualCommand}`);
    console.log('\nOr install Claude Code first: https://claude.ai/code');
    return false;
  }

  // Check if joan MCP is already configured
  try {
    const result = spawnSync('claude', ['mcp', 'list'], { encoding: 'utf8' });
    if (result.stdout && result.stdout.includes('joan')) {
      console.log('\n✓ Joan MCP already configured in Claude Code');
      return true;
    }
  } catch {
    // Continue with add
  }

  // Use claude mcp add to configure Joan MCP globally (user scope)
  // Uses npx -y for:
  //   - Automatic package resolution (works without global install)
  //   - Always fetches latest version if not cached
  //   - -y flag ensures non-interactive execution (critical for MCP server startup)
  try {
    const result = spawnSync(
      'claude',
      mcpCommand,
      { encoding: 'utf8', stdio: 'pipe' }
    );

    if (result.status !== 0) {
      throw new Error(result.stderr || 'Unknown error');
    }

    console.log('\n✓ Claude Code configured');
    console.log('  Joan MCP added to user config (available in all projects)');
    console.log('  Command: npx -y @pollychrome/joan-mcp serve');

    return true;
  } catch (error) {
    console.error(`\n⚠ Could not configure Claude Code automatically: ${(error as Error).message}`);
    console.log('\nManual configuration:');
    console.log(`  Run: ${manualCommand}`);
    return false;
  }
}

/**
 * Init command - full setup (login + configure Claude Code)
 */
async function init(): Promise<void> {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║       Joan MCP Server - Setup Wizard       ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Step 1: Check if already logged in
  const existing = await getStoredToken();
  if (existing && !isTokenExpired(existing.token)) {
    console.log(`✓ Already logged in as ${existing.email || 'unknown user'}\n`);
  } else {
    // Step 1: Login
    console.log('Step 1/2: Authenticate with Joan\n');
    await login();
    console.log('');
  }

  // Step 2: Configure Claude Code
  console.log('Step 2/2: Configure Claude Code\n');
  await configureClaudeCode();

  // Done!
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║            Setup Complete!                 ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('\nYou can now use Joan with Claude Code:');
  console.log('  • "Show me my projects in Joan"');
  console.log('  • "Create a task for implementing the login feature"');
  console.log('  • "Mark task XYZ as completed"');
  console.log('\nNote: Restart Claude Code for changes to take effect.');
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'serve';

  switch (command) {
    case 'init':
      await init();
      break;
    case 'login':
      await login();
      break;
    case 'logout':
      await logout();
      break;
    case 'status':
      await status();
      break;
    case 'serve':
      await serve();
      break;
    case 'help':
    case '--help':
    case '-h':
      console.log(HELP_TEXT);
      break;
    case 'version':
    case '--version':
    case '-v':
      console.log('joan-mcp v1.0.2');
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP_TEXT);
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
