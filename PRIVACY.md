# Privacy Policy — Claude Memory MCP Server

**Last updated:** February 7, 2026

## Overview

Claude Memory MCP Server ("the Extension") is an open-source local MCP server that stores markdown files on your computer. It does not collect, transmit, or process any personal data beyond what is stored in those local files.

## Data Collection

The Extension collects **no data**. Specifically:

- **No telemetry** — The Extension does not phone home, send analytics, or track usage.
- **No network requests** — The Extension communicates exclusively via stdio with the local MCP client (Claude Desktop, Claude Code, etc.). It makes zero outbound network connections.
- **No third-party services** — The Extension has no external dependencies that process user data.

## Data Storage

All memory files (e.g., `soul.md`) are stored as plain-text markdown files in a local directory on your machine:

- **Default location:** `~/.claude-memory/` (macOS/Linux) or `%USERPROFILE%\.claude-memory\` (Windows)
- **Custom location:** Configurable via the `CLAUDE_MEMORY_DIR` environment variable or the Extension's user configuration.

You own these files completely. They are never uploaded, synced, or shared by the Extension.

## Data Sharing

The Extension shares data with **no one**. Memory file contents are read by the local MCP client (e.g., Claude Desktop) over stdio, which is a local inter-process communication channel. No data leaves your machine through the Extension.

## Data Retention

Memory files persist on disk until you explicitly delete them, either through the `memory_delete_file` tool or by removing files manually from the memory directory.

## Security

- Path traversal protection prevents access to files outside the memory directory.
- The Extension runs with the same permissions as the MCP client that invokes it.

## Changes to This Policy

Updates to this privacy policy will be reflected in this document and in the Extension's repository at https://github.com/nocluetoday/claude-memory-mcp.

## Contact

For questions about this privacy policy, open an issue at https://github.com/nocluetoday/claude-memory-mcp/issues.
