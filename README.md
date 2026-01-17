# Joan MCP Server

Model Context Protocol (MCP) server for the Joan productivity app. Enables AI assistants like Claude Code to interact with your projects, tasks, goals, milestones, and notes.

## Features

- **Read & Write Access**: Full CRUD operations for projects, tasks, goals, milestones, and notes
- **Secure Authentication**: Login via browser with encrypted token storage
- **Claude Code Integration**: Works seamlessly with Claude Code and other MCP clients
- **Self-Describing**: Automatically provides usage instructions to AI assistants via MCP protocol
- **Production API**: Connects directly to your Joan account data

## Shared specs
- Cross-repo agentic workflow and MCP/API alignment live in `shared/joan-shared-specs`.

## Installation

### Option 1: npx (Recommended - No Install Required)

```bash
npx @pollychrome/joan-mcp init
```

This single command will:
1. Open your browser to authenticate with Joan
2. Store credentials securely on your machine
3. Configure Claude Code automatically

### Option 2: Global Install

```bash
npm install -g @pollychrome/joan-mcp

# Then run:
joan-mcp init
```

### Option 3: From Source (Development)

```bash
git clone https://github.com/pollychrome/joan-mcp.git
cd joan-mcp
npm install
npm run build
npm link
joan-mcp init
```

## Quick Start

```bash
npx @pollychrome/joan-mcp init
```

After setup, **restart Claude Code** and you're ready to go!

## Using Joan MCP in Any Project

Once you run `npx @pollychrome/joan-mcp init`, Joan is automatically configured globally. It works in **any project** without additional setup.

### Example Prompts

While working on any codebase, you can say:

```
"Create a task in Joan for the bug I just found"

"Show me my Joan projects"

"Add a note in Joan about this architecture decision"

"Mark my 'Review PR #42' task as completed"

"What tasks do I have in my Backend project?"

"Create a milestone called 'v2.0 Release' in Joan"
```

### How It Works

Joan MCP is **self-describing** - it automatically tells Claude Code:
- What Joan is and what it does
- All available tools and their parameters
- All available resources and URIs
- Valid field values (status, priority, etc.)

No manual documentation needed in your CLAUDE.md files.

### Manual Configuration (Optional)

The `init` command configures this automatically, but if needed, run:

```bash
claude mcp add joan -s user -- joan-mcp serve
```

This adds Joan MCP to your user config, making it available in all projects.

### Troubleshooting

**Joan MCP not working:**
1. Restart Claude Code completely
2. Run `npx @pollychrome/joan-mcp status` to check auth
3. Run `npx @pollychrome/joan-mcp login` to re-authenticate

## CLI Commands

All commands can be run with `npx @pollychrome/joan-mcp <command>`:

| Command | Description |
|---------|-------------|
| `init` | Full setup wizard (login + configure Claude Code) |
| `login` | Authenticate with Joan (opens browser) |
| `logout` | Clear stored credentials |
| `status` | Show authentication status |
| `serve` | Start the MCP server (default) |
| `help` | Show help message |

## Available Tools

These tools allow AI assistants to modify data in Joan:

### Task Tools

| Tool | Description |
|------|-------------|
| `create_task` | Create a new task (auto-places in matching column based on status) |
| `update_task` | Update task (auto-syncs column when status changes) |
| `complete_task` | Mark as completed and move to Done column |
| `delete_task` | Delete a task |
| `bulk_update_tasks` | Update multiple tasks in a single transaction |

### Project Tools

| Tool | Description |
|------|-------------|
| `create_project` | Create a new project |
| `update_project` | Update project name, description, status |
| `list_columns` | List Kanban columns for a project |

### Milestone Tools

| Tool | Description |
|------|-------------|
| `create_milestone` | Create a milestone in a project |
| `update_milestone` | Update milestone details |
| `delete_milestone` | Delete a milestone |
| `link_tasks_to_milestone` | Link tasks to a milestone |
| `unlink_task_from_milestone` | Remove task from milestone |

### Goal Tools

| Tool | Description |
|------|-------------|
| `create_goal` | Create a new goal |
| `update_goal` | Update goal title, status, progress |
| `delete_goal` | Delete a goal |
| `link_task_to_goal` | Link a task to track progress |
| `unlink_task_from_goal` | Remove task from goal |

### Note Tools

| Tool | Description |
|------|-------------|
| `create_note` | Create a new note |
| `update_note` | Update note content and metadata |
| `delete_note` | Delete a note |

## Available Resources

These resources provide read-only access to Joan data:

| Resource URI | Description |
|--------------|-------------|
| `joan://projects` | List all projects |
| `joan://projects/{id}` | Project details with stats |
| `joan://projects/{id}/tasks` | Tasks in a project |
| `joan://projects/{id}/milestones` | Project milestones |
| `joan://projects/{id}/columns` | Kanban columns |
| `joan://projects/{id}/analytics` | Project analytics |
| `joan://tasks` | All user tasks |
| `joan://tasks/{id}` | Task details |
| `joan://goals` | All goals |
| `joan://goals/{id}` | Goal with linked tasks |
| `joan://goals/{id}/stats` | Goal statistics |
| `joan://notes` | All notes |
| `joan://notes/{id}` | Note details |

## Status & Column Synchronization

Joan uses two parallel systems for task state:
- **Status**: `todo`, `in_progress`, `done`, `cancelled`
- **Column**: Kanban board column (e.g., "To Do", "In Progress", "Done")

By default, the MCP server **automatically synchronizes** these:

| Action | Behavior |
|--------|----------|
| `create_task` with status | Places task in matching column |
| `update_task` with status change | Moves task to matching column |
| `complete_task` | Sets status AND moves to Done column |

### Disabling Auto-Sync

All task tools support a `sync_column` parameter (default: `true`):

```
// Only update status, don't move column
update_task(task_id: "...", status: "done", sync_column: false)

// Only mark complete, don't move to Done column
complete_task(task_id: "...", sync_column: false)
```

### Column Override

Providing an explicit `column_id` always takes precedence over auto-sync:

```
// Move to specific column regardless of status
update_task(task_id: "...", status: "done", column_id: "custom-column-id")
```

## Development

### Run in Development Mode

```bash
cd mcp-server
npm run dev
```

### Type Check

```bash
npm run typecheck
```

### Build

```bash
npm run build
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JOAN_AUTH_TOKEN` | JWT authentication token | (from login) |
| `JOAN_API_URL` | API base URL | `https://joan-api.alexbbenson.workers.dev/api/v1` |

## Security

- Authentication tokens are encrypted at rest using AES-256-GCM
- Tokens are stored in `~/.joan-mcp/credentials.json` with restricted permissions (600)
- Tokens expire after 7 days
- You can revoke MCP access from your Joan profile settings

## Troubleshooting

### "Authentication failed"

```bash
npx @pollychrome/joan-mcp logout
npx @pollychrome/joan-mcp login
```

### "Token expired"

Tokens expire after 7 days. Run `npx @pollychrome/joan-mcp login` to re-authenticate.

### MCP server not connecting

1. Restart Claude Code completely
2. Check status: `npx @pollychrome/joan-mcp status`
3. Re-run setup: `npx @pollychrome/joan-mcp init`

## License

MIT
