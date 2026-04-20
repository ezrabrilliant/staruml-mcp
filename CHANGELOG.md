# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
