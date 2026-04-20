import { createServer as createHttpServer } from "node:http";
import { randomUUID } from "node:crypto";
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
  apiHost: string;
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("staruml-mcp")
    .description(packageJson.description)
    .version(packageJson.version)
    .option(
      "-t, --transport <transport>",
      `MCP transport: ${TRANSPORTS.join("|")}`,
      "stdio",
    )
    .option(
      "-p, --port <number>",
      "Port to listen on (HTTP transport only)",
      "3000",
    )
    .option(
      "--api-port <number>",
      "StarUML API Server port",
      "58321",
    )
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
    apiHost: string;
  }>();

  const options: CliOptions = {
    transport: validateTransport(raw.transport),
    port: parsePort(raw.port, "--port"),
    apiPort: parsePort(raw.apiPort, "--api-port"),
    apiHost: raw.apiHost,
  };

  const mcpServer = createServer({
    apiHost: options.apiHost,
    apiPort: options.apiPort,
    name: packageJson.name,
    version: packageJson.version,
  });

  if (options.transport === "stdio") {
    await startStdio(mcpServer);
  } else {
    await startHttp(mcpServer, options.port);
  }
}

async function startStdio(mcpServer: ReturnType<typeof createServer>): Promise<void> {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error("[staruml-mcp] stdio transport ready");
}

async function startHttp(
  mcpServer: ReturnType<typeof createServer>,
  port: number,
): Promise<void> {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  await mcpServer.connect(transport);

  const httpServer = createHttpServer(async (req, res) => {
    if (req.url !== "/mcp") {
      res.writeHead(404).end("Not Found");
      return;
    }
    try {
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("[staruml-mcp] request error:", error);
      if (!res.headersSent) {
        res.writeHead(500).end("Internal Server Error");
      }
    }
  });

  httpServer.listen(port, () => {
    console.error(`[staruml-mcp] http transport ready on http://localhost:${port}/mcp`);
  });

  const shutdown = async (): Promise<void> => {
    console.error("[staruml-mcp] shutting down…");
    httpServer.close();
    await transport.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function validateTransport(value: string): Transport {
  if ((TRANSPORTS as readonly string[]).includes(value)) {
    return value as Transport;
  }
  throw new Error(
    `Invalid --transport: "${value}". Must be one of: ${TRANSPORTS.join(", ")}`,
  );
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
