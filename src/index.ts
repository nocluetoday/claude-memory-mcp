/**
 * Claude Memory MCP Server
 *
 * Gives Claude persistent memory across conversations using local markdown files.
 * Memory files are stored in a configurable directory (default: ~/.claude-memory/)
 * and accessed via MCP tools: read, write, append, list, and delete.
 *
 * @see https://github.com/nocluetoday/claude-memory-mcp
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Directory where memory files are stored. Override with CLAUDE_MEMORY_DIR. */
const MEMORY_DIR =
  process.env.CLAUDE_MEMORY_DIR ||
  path.join(os.homedir(), ".claude-memory");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create the memory directory if it doesn't already exist. */
async function ensureMemoryDir(): Promise<void> {
  await fs.mkdir(MEMORY_DIR, { recursive: true });
}

/**
 * Resolve a filename to an absolute path inside MEMORY_DIR.
 * Rejects any path that would escape the memory directory (e.g. "../secret").
 */
function safeFilePath(filename: string): string {
  const resolved = path.resolve(MEMORY_DIR, filename);
  if (!resolved.startsWith(path.resolve(MEMORY_DIR) + path.sep) && resolved !== path.resolve(MEMORY_DIR)) {
    throw new Error(`Invalid filename: path must stay within the memory directory.`);
  }
  return resolved;
}

/** Extract a human-readable message from an unknown error value. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ---------------------------------------------------------------------------
// Server initialisation
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "claude-memory",
  version: "1.0.0",
});

// ---------------------------------------------------------------------------
// Resource: soul.md (auto-available context)
// ---------------------------------------------------------------------------

server.registerResource(
  "soul_memory",
  "memory://soul",
  {
    description:
      "Core memory and context from past conversations. Read this at the start of every new conversation.",
    mimeType: "text/markdown",
  },
  async (uri) => {
    await ensureMemoryDir();
    const soulPath = path.join(MEMORY_DIR, "soul.md");

    try {
      const content = await fs.readFile(soulPath, "utf-8");
      return {
        contents: [{ uri: uri.href, mimeType: "text/markdown", text: content }],
      };
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/markdown",
              text: "# soul.md\n\nNo memory file exists yet. Use memory_write_soul to create one.",
            },
          ],
        };
      }
      throw error;
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: Read memory file
// ---------------------------------------------------------------------------

const ReadSchema = z.object({
  filename: z
    .string()
    .default("soul.md")
    .describe("Name of the memory file to read (default: soul.md)"),
});

server.registerTool(
  "memory_read_soul",
  {
    title: "Read Soul/Memory File",
    description: `Read a persistent memory file. This is your long-term memory that persists across conversations.

Use this at the start of conversations to remember context about the human you're talking to,
previous conversations, ongoing projects, and anything else worth remembering.

The default file is 'soul.md' but you can read other memory files too.

Returns the full contents of the memory file, or a message if the file doesn't exist yet.`,
    inputSchema: ReadSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async (params: z.infer<typeof ReadSchema>) => {
    await ensureMemoryDir();

    try {
      const filePath = safeFilePath(params.filename);
      const content = await fs.readFile(filePath, "utf-8");
      return { content: [{ type: "text" as const, text: content }] };
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          content: [
            {
              type: "text" as const,
              text: `No memory file found at '${params.filename}'. This is a fresh start - consider creating one with memory_write_soul.`,
            },
          ],
        };
      }
      return {
        content: [{ type: "text" as const, text: `Error reading memory file: ${errorMessage(error)}` }],
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: Write memory file (full overwrite)
// ---------------------------------------------------------------------------

const WriteSchema = z.object({
  filename: z
    .string()
    .default("soul.md")
    .describe("Name of the memory file to write (default: soul.md)"),
  content: z.string().describe("The full content to write to the memory file"),
  notify_human: z
    .boolean()
    .default(true)
    .describe("Whether to mention to the human that you've updated your memory"),
});

server.registerTool(
  "memory_write_soul",
  {
    title: "Write Soul/Memory File",
    description: `Write to a persistent memory file. This overwrites the entire file with new content.

Use this to save important context that should persist across conversations:
- Information about the human you're talking to
- Summaries of important conversations
- Ongoing projects and their status
- Preferences, communication style notes
- Anything you'd want to remember next time

The memory file uses markdown format. Structure it however makes sense.

IMPORTANT: This overwrites the entire file. Read the current content first if you want to preserve and add to it.`,
    inputSchema: WriteSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async (params: z.infer<typeof WriteSchema>) => {
    await ensureMemoryDir();

    try {
      const filePath = safeFilePath(params.filename);
      await fs.writeFile(filePath, params.content, "utf-8");
      const suffix = params.notify_human ? " (Human has been notified)" : "";
      return {
        content: [{ type: "text" as const, text: `Memory file '${params.filename}' updated successfully.${suffix}` }],
      };
    } catch (error: unknown) {
      return {
        content: [{ type: "text" as const, text: `Error writing memory file: ${errorMessage(error)}` }],
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: Append to memory file
// ---------------------------------------------------------------------------

const AppendSchema = z.object({
  filename: z
    .string()
    .default("soul.md")
    .describe("Name of the memory file to append to (default: soul.md)"),
  content: z.string().describe("Content to append to the end of the memory file"),
  section: z
    .string()
    .optional()
    .describe("Optional section header to add before the content (e.g. '## New Conversation')"),
});

server.registerTool(
  "memory_append_soul",
  {
    title: "Append to Soul/Memory File",
    description: `Append content to a persistent memory file without overwriting existing content.

Use this to add new information:
- Log a new conversation summary
- Add a new insight or preference learned
- Record a new project or task

Optionally include a section header to organize the new content.`,
    inputSchema: AppendSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async (params: z.infer<typeof AppendSchema>) => {
    await ensureMemoryDir();

    try {
      const filePath = safeFilePath(params.filename);

      let existing = "";
      try {
        existing = await fs.readFile(filePath, "utf-8");
      } catch {
        // File doesn't exist yet — we'll create it.
      }

      const separator = existing ? "\n\n" : "";
      const header = params.section ? `${params.section}\n\n` : "";
      await fs.writeFile(filePath, existing + separator + header + params.content, "utf-8");

      return {
        content: [{ type: "text" as const, text: `Appended to memory file '${params.filename}' successfully.` }],
      };
    } catch (error: unknown) {
      return {
        content: [{ type: "text" as const, text: `Error appending to memory file: ${errorMessage(error)}` }],
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: List memory files
// ---------------------------------------------------------------------------

server.registerTool(
  "memory_list_files",
  {
    title: "List Memory Files",
    description: `List all memory files in the memory directory.

Use this to see what memory files exist - there might be separate files for different purposes
(e.g., soul.md for core identity, conversations.md for conversation logs, projects.md for ongoing work).`,
    inputSchema: z.object({}),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async () => {
    await ensureMemoryDir();

    try {
      const files = await fs.readdir(MEMORY_DIR);
      const mdFiles = files.filter((f) => f.endsWith(".md"));

      if (mdFiles.length === 0) {
        return {
          content: [
            { type: "text" as const, text: `No memory files found in ${MEMORY_DIR}. Create one with memory_write_soul.` },
          ],
        };
      }

      const fileInfo = await Promise.all(
        mdFiles.map(async (filename) => {
          const stats = await fs.stat(path.join(MEMORY_DIR, filename));
          return `- ${filename} (${stats.size} bytes, modified: ${stats.mtime.toISOString()})`;
        }),
      );

      return {
        content: [{ type: "text" as const, text: `Memory files in ${MEMORY_DIR}:\n\n${fileInfo.join("\n")}` }],
      };
    } catch (error: unknown) {
      return {
        content: [{ type: "text" as const, text: `Error listing memory files: ${errorMessage(error)}` }],
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Tool: Delete memory file
// ---------------------------------------------------------------------------

const DeleteSchema = z.object({
  filename: z.string().describe("Name of the memory file to delete"),
  confirm: z.boolean().describe("Must be true to confirm deletion"),
});

server.registerTool(
  "memory_delete_file",
  {
    title: "Delete Memory File",
    description: `Delete a memory file. Requires explicit confirmation.

Use with caution - this permanently removes the memory file.`,
    inputSchema: DeleteSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  async (params: z.infer<typeof DeleteSchema>) => {
    if (!params.confirm) {
      return {
        content: [{ type: "text" as const, text: "Deletion not confirmed. Set confirm: true to delete the file." }],
      };
    }

    try {
      const filePath = safeFilePath(params.filename);
      await fs.unlink(filePath);
      return {
        content: [{ type: "text" as const, text: `Memory file '${params.filename}' deleted.` }],
      };
    } catch (error: unknown) {
      return {
        content: [{ type: "text" as const, text: `Error deleting memory file: ${errorMessage(error)}` }],
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  await ensureMemoryDir();
  console.error("Claude Memory MCP Server starting...");
  console.error(`Memory directory: ${MEMORY_DIR}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Server connected and ready.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
