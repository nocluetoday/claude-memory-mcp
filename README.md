# Claude Memory MCP Server

An [MCP](https://modelcontextprotocol.io) server that gives Claude persistent memory across conversations using local markdown files.

Every conversation with Claude starts fresh — no memory of who you are, what you've been working on, or what you talked about yesterday. This server fixes that. It stores context in simple markdown files on your machine and exposes them to Claude through the Model Context Protocol, so each new session can pick up where the last one left off.

## How It Works

The server provides five MCP tools:

| Tool | Description |
|---|---|
| `memory_read_soul` | Read a memory file (defaults to `soul.md`) |
| `memory_write_soul` | Overwrite a memory file with new content |
| `memory_append_soul` | Append to a memory file without overwriting |
| `memory_list_files` | List all memory files and their sizes |
| `memory_delete_file` | Delete a memory file (requires confirmation) |

It also registers a **resource** (`memory://soul`) so clients that support MCP resources can automatically surface your `soul.md` at the start of every conversation.

Memory files are plain markdown stored in `~/.claude-memory/` by default. You own your data — it never leaves your machine.

## Quick Start

### Prerequisites

- Node.js 18+
- An MCP-compatible client ([Claude Desktop](https://claude.ai/download), [Claude Code](https://docs.anthropic.com/en/docs/claude-code), etc.)

### Install

```bash
git clone https://github.com/nocluetoday/claude-memory-mcp.git
cd claude-memory-mcp
npm install
npm run build
```

### Configure Your Client

#### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "claude-memory": {
      "command": "node",
      "args": ["/absolute/path/to/claude-memory-mcp/dist/index.js"]
    }
  }
}
```

#### Claude Code (CLI)

The easiest way is the `claude mcp add` command:

```bash
claude mcp add claude-memory --transport stdio -- node /absolute/path/to/claude-memory-mcp/dist/index.js
```

Or add it manually to `.mcp.json` in your project root (shared with your team) or `~/.claude.json` (personal, all projects):

```json
{
  "mcpServers": {
    "claude-memory": {
      "command": "node",
      "args": ["/absolute/path/to/claude-memory-mcp/dist/index.js"]
    }
  }
}
```

You can also import servers already configured in Claude Desktop:

```bash
claude mcp add-from-claude-desktop
```

#### Claude Web (claude.ai)

Claude.ai only supports **remote** MCP servers through its Integrations feature. Since this is a local stdio server, it won't work directly with the web interface. Use Claude Desktop or Claude Code instead.

Then restart your client.

### Create Your First Memory

Start a conversation and say something like:

> "Read my soul.md file."

Claude will see it doesn't exist yet. Then:

> "Create a soul.md file. Remember that my name is [your name], I'm a [your role], and I'm currently working on [your project]."

From now on, every new conversation can start by reading that file to restore context.

## Examples

### Example 1: Reading memory at the start of a conversation

**You say:**

> "Read my soul.md file to remember who I am."

**Claude calls:** `memory_read_soul` with `filename: "soul.md"`

**Result:** Claude reads your stored context and greets you by name, remembers your projects, and picks up where you left off. If no file exists yet, it tells you and offers to create one.

### Example 2: Saving context after a conversation

**You say:**

> "Save what we discussed today. Remember that I decided to use PostgreSQL instead of MongoDB for the auth service."

**Claude calls:** `memory_append_soul` with:
```json
{
  "filename": "soul.md",
  "section": "## 2026-02-07 — Architecture Decision",
  "content": "- Decided to use PostgreSQL over MongoDB for the auth service\n- Reason: need strong transactional guarantees for user data"
}
```

**Result:** The new section is appended to `soul.md` without overwriting anything. Next time, Claude will know about the database decision.

### Example 3: Managing multiple memory files

**You say:**

> "List my memory files, then create a new one called projects.md with my current project details."

**Claude calls:** `memory_list_files` (no parameters)

**Result:**
```
Memory files in /Users/you/.claude-memory/:

- soul.md (1842 bytes, modified: 2026-02-07T10:30:00.000Z)
```

**Claude then calls:** `memory_write_soul` with:
```json
{
  "filename": "projects.md",
  "content": "# Active Projects\n\n## Auth Service Rewrite\n- Status: In progress\n- Stack: Node.js, PostgreSQL, Redis\n- Current focus: OAuth2 flow implementation"
}
```

**Result:** A new `projects.md` file is created. You now have separate files for identity (`soul.md`) and project tracking (`projects.md`).

## The `soul.md` File

The default memory file is `soul.md` — a markdown document that acts as a letter from past conversations to future ones. Think of it as a briefing document that Claude reads at the start of each session.

A good `soul.md` might include:

- **Who you are** — name, role, what you care about
- **Active projects** — what you're working on, current status
- **Preferences** — communication style, tools you use, things to avoid
- **Key context** — important decisions, recurring themes, shared vocabulary

See [`soul.md.template`](soul.md.template) for a starting structure.

You can also create additional memory files for different purposes:

| File | Purpose |
|---|---|
| `soul.md` | Core identity, preferences, active context |
| `projects.md` | Detailed project notes and status |
| `conversations.md` | Summaries of important past conversations |
| `work.md` | Work-specific context (separate from personal) |

## Configuration

### Custom Memory Directory

Set the `CLAUDE_MEMORY_DIR` environment variable to store files somewhere else:

```json
{
  "mcpServers": {
    "claude-memory": {
      "command": "node",
      "args": ["/absolute/path/to/claude-memory-mcp/dist/index.js"],
      "env": {
        "CLAUDE_MEMORY_DIR": "/path/to/your/memory/folder"
      }
    }
  }
}
```

Default: `~/.claude-memory/`

## Security

- **Local only** — all data stays on your machine in plain text files you control.
- **Path traversal protection** — filenames like `../../../etc/passwd` are rejected; all file operations are confined to the memory directory.
- **No network access** — the server communicates only via stdio with the MCP client.

## Development

```bash
npm run dev     # Watch mode — recompiles on save
npm run build   # One-time build
npm start       # Run the compiled server
```

The source is a single TypeScript file at `src/index.ts`. The compiled output goes to `dist/`.

## Troubleshooting

**Server not starting**
- Verify Node.js 18+ is installed: `node --version`
- Rebuild: `npm run build`
- Check the path in your client config points to the compiled `dist/index.js`, not `src/index.ts`

**"No memory file found" message**
- This is expected on first use. Ask Claude to create a `soul.md` and it will.

**Permission errors**
- The memory directory (`~/.claude-memory/`) must be writable by your user. Check permissions with `ls -la ~/.claude-memory/`.

**Windows path issues**
- Use forward slashes or escaped backslashes in your config: `"C:/Users/you/claude-memory-mcp/dist/index.js"`
- The `CLAUDE_MEMORY_DIR` environment variable works the same way on Windows.

## Privacy

All data stays on your machine. The server makes no network connections, collects no telemetry, and shares nothing with third parties. See the full [Privacy Policy](PRIVACY.md).

## Support

- [GitHub Issues](https://github.com/nocluetoday/claude-memory-mcp/issues) for bug reports and feature requests

## License

MIT — see [LICENSE](LICENSE).
