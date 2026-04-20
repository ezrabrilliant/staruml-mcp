# staruml-mcp

[![npm version](https://img.shields.io/npm/v/staruml-mcp.svg)](https://www.npmjs.com/package/staruml-mcp)
[![npm downloads](https://img.shields.io/npm/dm/staruml-mcp.svg)](https://www.npmjs.com/package/staruml-mcp)
[![CI](https://github.com/ezrabrilliant/staruml-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/ezrabrilliant/staruml-mcp/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-compatible-blue.svg)](https://modelcontextprotocol.io/)

Model Context Protocol (MCP) server for [StarUML](https://staruml.io). Lets AI agents generate UML diagrams directly in StarUML from Mermaid code.

**Works with:** Claude Code, Claude Desktop, Cursor, VS Code Copilot, Codex CLI, and any other MCP-compatible client.

**Supports both transports:** `stdio` (traditional) and `Streamable HTTP` (works around stdio compatibility issues in some clients, e.g. [Claude Code stdio MCP bug](https://github.com/anthropics/claude-code/issues/36914)).

## Features

- Generate diagrams from Mermaid source: `classDiagram`, `sequenceDiagram`, `flowchart`, `erDiagram`, `mindmap`, `requirementDiagram`, `stateDiagram`
- List, inspect, and export diagrams from the open StarUML project
- Zero-config: auto-connects to StarUML's API Server on `localhost:58321`
- Dual transport (stdio + Streamable HTTP)
- Strict TypeScript, zod-validated I/O, structured errors

## Prerequisites

- **StarUML v7.0.0+** — must be running with API Server enabled
- **Node.js 20+**

### Enable StarUML API Server

Edit `settings.json` at:
- **Windows:** `%APPDATA%\StarUML\settings.json`
- **macOS:** `~/Library/Application Support/StarUML/settings.json`
- **Linux:** `~/.config/StarUML/settings.json`

Add or update:
```json
{
  "apiServer": true,
  "apiServerPort": 58321
}
```

Restart StarUML.

Verify:
```bash
curl http://localhost:58321/
# → "Hello from StarUML API Server!"
```

## Install & Use

### Claude Code (recommended — HTTP transport)

Start the server in a terminal:
```bash
npx -y staruml-mcp --transport http --port 3333
```

Register with Claude Code:
```bash
claude mcp add --transport http staruml http://localhost:3333/mcp
```

Restart Claude Code. Ask:
> "What StarUML tools do you have?"

### Claude Desktop (stdio transport)

Edit `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "staruml": {
      "command": "npx",
      "args": ["-y", "staruml-mcp"]
    }
  }
}
```

Restart Claude Desktop.

### Cursor / VS Code Copilot / Codex CLI

Point your MCP client at `npx -y staruml-mcp` (stdio) or `http://localhost:3333/mcp` (HTTP).

## CLI

```
staruml-mcp [options]

  -t, --transport <type>   stdio | http            (default: stdio)
  -p, --port <number>      HTTP listen port        (default: 3000)
      --api-port <number>  StarUML API port        (default: 58321)
      --api-host <url>     StarUML API host prefix (default: http://localhost)
  -V, --version            Print version
  -h, --help               Show help
```

## Tools Exposed

| Tool | Description |
|---|---|
| `generate_diagram` | Generate a UML diagram from Mermaid code. |
| `get_all_diagrams_info` | List all diagrams in the current project (id, name, type). |
| `get_current_diagram_info` | Get metadata of the currently focused diagram. |
| `get_diagram_image_by_id` | Export a diagram as PNG by its ID. |

## Example Prompts

- *"Create an ER diagram in StarUML for a POS database: users, menus, transactions with relationships."*
- *"Generate a sequence diagram for JWT login: frontend → /api/auth/login → AuthService → DB → JWT response."*
- *"Show me the current diagram in StarUML."*
- *"Export diagram with ID `xyz123` as an image."*

## Development

```bash
git clone https://github.com/ezrabrilliant/staruml-mcp.git
cd staruml-mcp
npm install
npm run dev          # tsx watch on src/
npm run build        # bundle to dist/
npm test             # vitest
npm run typecheck    # tsc --noEmit
```

## Architecture

```
AI Agent (Claude Code / Cursor / VS Code / …)
        │
        │  MCP (stdio or Streamable HTTP)
        ▼
  staruml-mcp  (this package)
        │
        │  HTTP JSON-RPC
        ▼
StarUML API Server (port 58321)
        │
        ▼
  StarUML Application (v7+)
```

## Acknowledgments

Inspired by [`staruml/staruml-mcp-server`](https://github.com/staruml/staruml-mcp-server) (official stdio-only server by Minkyu Lee, StarUML creator). This project reimplements it with multi-transport support and strict TypeScript.

## License

[MIT](LICENSE) © Ezra Brilliant Konterliem
