# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.2] - 2026-04-20

### Fixed
- HTTP transport: non-`/mcp` paths now return **JSON 404** instead of plaintext `Not Found`. Previously, MCP clients probing OAuth discovery endpoints (`/.well-known/oauth-authorization-server`, etc. per RFC 8414/9728) received a plaintext body and crashed their JSON parser with `SyntaxError: Unexpected identifier "Not"` — manifesting as `SDK auth failed: HTTP 404: Invalid OAuth error response` in Claude Code. Discovered while connecting Claude Code v1.x to the `/mcp` endpoint.
- Added explicit handling for `/` (returns JSON server banner) and `/.well-known/*` (returns JSON 404 advertising `auth_required: false`) so MCP clients know the server is unauthenticated without needing to parse malformed responses.
- `500 Internal Server Error` responses also now JSON-formatted with the actual error message.

## [0.3.1] - 2026-04-20

### Changed
- **Default HTTP `--port` changed from `3000` → `58323`** to eliminate conflicts with Next.js/Vite/React dev servers (which claim `3000` by default) and to align with the StarUML ecosystem (`58321` built-in API, `58322` extension, `58323` MCP HTTP).
- README now matches the CLI default: install snippets no longer require `--port 3333`. Use `npx -y staruml-mcp --transport http` and point Claude Code at `http://localhost:58323/mcp`.

### Migration
- Existing users with `claude mcp add --transport http staruml http://localhost:<old>/mcp` should update the URL to `:58323`, or continue overriding via `--port <old>`.
- The `--port` flag is retained, so power users with port conflicts can still pick their own.

## [0.3.0] - 2026-04-20

### Added
- **`create_element_with_view`** tool — creates a model element AND its visual View on a target diagram in one call. Required to populate native typed diagrams (UMLUseCaseDiagram, UMLActivityDiagram, UMLClassDiagram, etc.); `create_element` alone only adds to the model tree without putting shapes on the canvas. Returns both `view._id` (for subsequent edge connections) and `model._id`.
- **`create_edge_with_view`** tool — connects two existing Views on a diagram with a typed edge (`UMLAssociation`, `UMLControlFlow`, `UMLMessage`, `UMLGeneralization`, `UMLDependency`). Pair with `create_element_with_view` to build full diagrams programmatically.

### Changed
- `create_element` description clarified: it creates MODEL only. Use `create_element_with_view` for native typed diagrams.

### Requires
- `staruml-mcp-extension` **v0.2.0+** (for `/create_element_with_view` and `/create_edge_with_view` endpoints, and for the fixed cascade `delete_element`). Install or upgrade via StarUML → Extension Manager → Install From URL: `https://github.com/ezrabrilliant/staruml-mcp-extension`.

## [0.2.2] - 2026-04-20

### Fixed
- HTTP transport: create fresh `McpServer` + `StreamableHTTPServerTransport` **per request** instead of sharing a singleton. The previous singleton pattern rejected any request after the first `initialize` with HTTP 500, breaking MCP clients that reconnect. This is the canonical stateless pattern from MCP SDK docs.

## [0.2.1] - 2026-04-20

### Fixed
- HTTP transport: switched to **stateless mode** (`sessionIdGenerator: undefined`) to fix "Server already initialized" error when Claude Code's MCP client reconnects. Previously used stateful sessions with a singleton transport, which only accepted one initialize call across its lifetime.

## [0.2.0] - 2026-04-20

### Added
- **15 new tools** that call `staruml-mcp-extension` (port 58322) for operations not exposed by StarUML's built-in HTTP API:
  - Commands: `get_all_commands`, `execute_command` (unlocks all 138+ built-in StarUML commands)
  - Project lifecycle: `get_project_info`, `save_project`, `save_project_as`, `new_project`, `open_project`
  - Element CRUD: `get_element_by_id`, `find_elements`, `create_element`, `update_element`, `delete_element`
  - Diagram management: `create_diagram` (typed UML: UMLClassDiagram, UMLUseCaseDiagram, UMLSequenceDiagram, UMLActivityDiagram, ERDDiagram, etc.), `switch_diagram`, `close_diagram`
- New CLI flag `--ext-port <number>` (default `58322`) to configure extension port.
- `StarUMLClient.pingExtension()` helper to detect if the extension is installed.

### Requirements for new tools
The 15 extension tools require `staruml-mcp-extension` installed in StarUML.
Install via StarUML → Tools → Extension Manager → Install From URL:
`https://github.com/ezrabrilliant/staruml-mcp-extension`.

The original 4 Mermaid/diagram tools continue to work without the extension.

## [0.1.0] - 2026-04-20

### Added
- Initial release of `staruml-mcp`.
- StarUML HTTP API client (`StarUMLClient`) with zod-validated responses, structured `StarUMLApiError`, configurable host/port, and `ping()` health check.
- MCP server exposing four tools that mirror StarUML's HTTP API surface:
  - `generate_diagram` — generate UML diagrams from Mermaid code (supports `classDiagram`, `sequenceDiagram`, `flowchart`, `erDiagram`, `mindmap`, `requirementDiagram`, `stateDiagram`).
  - `get_all_diagrams_info` — list all diagrams in the open project.
  - `get_current_diagram_info` — inspect the currently active diagram.
  - `get_diagram_image_by_id` — export a diagram as PNG.
- Dual transport support: `stdio` (default) and Streamable HTTP (stateful session mode with UUID session IDs).
- CLI (`commander`-based) with flags: `--transport`, `--port`, `--api-port`, `--api-host`.
- Build pipeline with `tsup` producing a single ESM bundle targeting Node 20+.
- Strict TypeScript configuration (`strict: true`, `noUncheckedIndexedAccess`).
- MIT license and MCP Registry metadata (`mcpName: io.github.ezrabrilliant/staruml-mcp`).

### Acknowledgments
- Inspired by [`staruml/staruml-mcp-server`](https://github.com/staruml/staruml-mcp-server) by Minkyu Lee (StarUML creator).
- Reimplemented with multi-transport support to work around stdio MCP registration issues in some clients (e.g., [Claude Code #36914](https://github.com/anthropics/claude-code/issues/36914)).

[Unreleased]: https://github.com/ezrabrilliant/staruml-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ezrabrilliant/staruml-mcp/releases/tag/v0.1.0
