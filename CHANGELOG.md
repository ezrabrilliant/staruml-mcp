# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
