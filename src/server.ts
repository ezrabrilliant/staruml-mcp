import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { StarUMLClient } from "./staruml-client.js";

const SUPPORTED_MERMAID_DIAGRAMS = [
  "classDiagram",
  "sequenceDiagram",
  "flowchart",
  "erDiagram",
  "mindmap",
  "requirementDiagram",
  "stateDiagram",
] as const;

export interface ServerConfig {
  apiPort?: number;
  apiHost?: string;
  name?: string;
  version?: string;
}

export function createServer(config: ServerConfig = {}): McpServer {
  const client = new StarUMLClient({
    host: config.apiHost,
    port: config.apiPort,
  });

  const server = new McpServer({
    name: config.name ?? "staruml-mcp",
    version: config.version ?? "0.1.0",
  });

  server.tool(
    "generate_diagram",
    `Generate a UML diagram in StarUML from Mermaid code. Supported Mermaid diagram types: ${SUPPORTED_MERMAID_DIAGRAMS.join(", ")}. StarUML must be running with apiServer enabled.`,
    {
      code: z
        .string()
        .min(1)
        .describe(
          `Mermaid diagram source code. Must start with one of: ${SUPPORTED_MERMAID_DIAGRAMS.join(", ")}. Example: "flowchart LR\\n  A[Start] --> B[End]"`,
        ),
    },
    async ({ code }) => {
      try {
        await client.generateDiagram(code);
        return {
          content: [
            {
              type: "text",
              text: "Diagram successfully generated in StarUML.",
            },
          ],
        };
      } catch (error) {
        return toolError(`Failed to generate diagram: ${formatError(error)}`);
      }
    },
  );

  server.tool(
    "get_all_diagrams_info",
    "Get metadata (id, name, type) for all diagrams in the currently open StarUML project.",
    {},
    async () => {
      try {
        const data = await client.getAllDiagramsInfo();
        return {
          content: [
            {
              type: "text",
              text: `Diagrams: ${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return toolError(`Failed to get all diagrams info: ${formatError(error)}`);
      }
    },
  );

  server.tool(
    "get_current_diagram_info",
    "Get metadata for the currently active (focused) diagram in StarUML.",
    {},
    async () => {
      try {
        const data = await client.getCurrentDiagramInfo();
        const text = data
          ? `Current diagram: ${JSON.stringify(data, null, 2)}`
          : "No diagram is currently active.";
        return { content: [{ type: "text", text }] };
      } catch (error) {
        return toolError(`Failed to get current diagram info: ${formatError(error)}`);
      }
    },
  );

  server.tool(
    "get_diagram_image_by_id",
    "Retrieve a PNG image of a diagram by its ID. Use get_all_diagrams_info first to obtain IDs.",
    {
      diagramId: z
        .string()
        .min(1)
        .describe(
          "Diagram ID. Obtain from get_all_diagrams_info tool (each diagram entry has an 'id' field).",
        ),
    },
    async ({ diagramId }) => {
      try {
        const image = await client.getDiagramImageById(diagramId);
        return {
          content: [
            {
              type: "image",
              data: image,
              mimeType: "image/png",
            },
          ],
        };
      } catch (error) {
        return toolError(`Failed to get diagram image: ${formatError(error)}`);
      }
    },
  );

  return server;
}

function toolError(message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
