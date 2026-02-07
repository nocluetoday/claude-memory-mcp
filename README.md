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

#### Claude Code

Add to `~/.claude/settings.json`:

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

Then restart your client.

### Create Your First Memory

Start a conversation and say something like:

> "Read my soul.md file."

Claude will see it doesn't exist yet. Then:

> "Create a soul.md file. Remember that my name is [your name], I'm a [your role], and I'm currently working on [your project]."

From now on, every new conversation can start by reading that file to restore context.

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

## License

MIT — see [LICENSE](LICENSE).
