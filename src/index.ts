import { createServer as createHttpServer } from "node:http";
import { Command } from "commander";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";
import packageJson from "../package.json" with { type: "json" };

const TRANSPORTS = ["stdio", "http"] as const;
type Transport = (typeof TRANSPORTS)[number];

interface CliOptions {
  transport: Transport;
  port: number;
  apiPort: number;
  extPort: number;
  apiHost: string;
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("staruml-mcp")
    .description(packageJson.description)
    .version(packageJson.version)
    .option("-t, --transport <transport>", `MCP transport: ${TRANSPORTS.join("|")}`, "stdio")
    .option("-p, --port <number>", "Port to listen on (HTTP transport only)", "58323")
    .option("--api-port <number>", "StarUML built-in API Server port", "58321")
    .option("--ext-port <number>", "staruml-mcp-extension HTTP port (for extended tools)", "58322")
    .option(
      "--api-host <url>",
      "StarUML API Server host (protocol + hostname, without port)",
      "http://localhost",
    )
    .parse();

  const raw = program.opts<{
    transport: string;
    port: string;
    apiPort: string;
    extPort: string;
    apiHost: string;
  }>();

  const options: CliOptions = {
    transport: validateTransport(raw.transport),
    port: parsePort(raw.port, "--port"),
    apiPort: parsePort(raw.apiPort, "--api-port"),
    extPort: parsePort(raw.extPort, "--ext-port"),
    apiHost: raw.apiHost,
  };

  const serverConfig = {
    apiHost: options.apiHost,
    apiPort: options.apiPort,
    extPort: options.extPort,
    name: packageJson.name,
    version: packageJson.version,
  };

  if (options.transport === "stdio") {
    await startStdio(createServer(serverConfig));
  } else {
    await startHttp(options.port, serverConfig);
  }
}

async function startStdio(mcpServer: ReturnType<typeof createServer>): Promise<void> {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error("[staruml-mcp] stdio transport ready");
}

type ServerConfig = NonNullable<Parameters<typeof createServer>[0]>;

async function startHttp(port: number, serverConfig: ServerConfig): Promise<void> {
  // Stateless mode: create a fresh server + transport per HTTP request so
  // reconnects from MCP clients (Claude Code, Cursor, etc.) always get a
  // clean state. This is the canonical pattern per MCP SDK docs.
  const httpServer = createHttpServer(async (req, res) => {
    const url = req.url ?? "/";

    // Root — friendly JSON banner, helps anyone poking at the server.
    if (url === "/" || url === "") {
      res.writeHead(200, { "Content-Type": "application/json" }).end(
        JSON.stringify({
          name: serverConfig.name,
          version: serverConfig.version,
          mcp_endpoint: "/mcp",
          transport: "streamable-http",
          auth_required: false,
        }),
      );
      return;
    }

    // OAuth discovery probes (RFC 8414 / RFC 9728). MCP clients (e.g. Claude
    // Code) try these paths to see if the server requires auth. We advertise
    // "no auth" by returning a well-formed JSON 404 so clients don't crash
    // trying to parse a plaintext body. This server is unauthenticated — it
    // listens on localhost and exposes read/write of the local StarUML project.
    if (url.startsWith("/.well-known/")) {
      res.writeHead(404, { "Content-Type": "application/json" }).end(
        JSON.stringify({
          error: "not_found",
          error_description:
            "staruml-mcp does not require OAuth. Use the /mcp endpoint directly.",
        }),
      );
      return;
    }

    if (url !== "/mcp") {
      res.writeHead(404, { "Content-Type": "application/json" }).end(
        JSON.stringify({
          error: "not_found",
          error_description: `Unknown path "${url}". Use /mcp for MCP streamable-http transport.`,
        }),
      );
      return;
    }

    const mcpServer = createServer(serverConfig);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      void transport.close();
      void mcpServer.close();
    });

    try {
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("[staruml-mcp] request error:", error);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" }).end(
          JSON.stringify({
            error: "internal_error",
            error_description: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }
  });

  httpServer.listen(port, () => {
    console.error(`[staruml-mcp] http transport ready on http://localhost:${port}/mcp`);
  });

  const shutdown = (): void => {
    console.error("[staruml-mcp] shutting down…");
    httpServer.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function validateTransport(value: string): Transport {
  if ((TRANSPORTS as readonly string[]).includes(value)) {
    return value as Transport;
  }
  throw new Error(`Invalid --transport: "${value}". Must be one of: ${TRANSPORTS.join(", ")}`);
}

function parsePort(value: string, flag: string): number {
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid ${flag}: "${value}". Must be an integer 1–65535.`);
  }
  return port;
}

main().catch((error) => {
  console.error("[staruml-mcp] fatal:", error instanceof Error ? error.message : error);
  process.exit(1);
});
