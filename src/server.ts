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
  extPort?: number;
  name?: string;
  version?: string;
}

export function createServer(config: ServerConfig = {}): McpServer {
  const client = new StarUMLClient({
    host: config.apiHost,
    port: config.apiPort,
    extPort: config.extPort,
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

  // =========================================================================
  // Extension tools (require staruml-mcp-extension installed on port 58322)
  // https://github.com/ezrabrilliant/staruml-mcp-extension
  // =========================================================================

  const EXT_NOTE =
    "Requires staruml-mcp-extension to be installed in StarUML. Install from https://github.com/ezrabrilliant/staruml-mcp-extension";

  server.tool(
    "get_all_commands",
    `List all registered StarUML command IDs (e.g. 'project:save', 'view:fit-to-window', 'alignment:align-left'). Useful to discover what execute_command can trigger. ${EXT_NOTE}`,
    {},
    async () => {
      try {
        const data = await client.getAllCommands();
        return {
          content: [{ type: "text", text: `Commands: ${JSON.stringify(data, null, 2)}` }],
        };
      } catch (error) {
        return toolError(`Failed to get commands: ${formatError(error)}`);
      }
    },
  );

  server.tool(
    "execute_command",
    `Execute any built-in StarUML command by its ID. Use get_all_commands to discover available IDs. ${EXT_NOTE}`,
    {
      id: z
        .string()
        .min(1)
        .describe("Command ID. Examples: 'project:save', 'view:fit-to-window', 'project:new'"),
      args: z
        .array(z.unknown())
        .optional()
        .describe("Optional positional arguments passed to the command handler"),
    },
    async ({ id, args }) => {
      try {
        const data = await client.executeCommand(id, args);
        return {
          content: [{ type: "text", text: `Executed: ${JSON.stringify(data, null, 2)}` }],
        };
      } catch (error) {
        return toolError(`Failed to execute command: ${formatError(error)}`);
      }
    },
  );

  server.tool(
    "get_project_info",
    `Get the current StarUML project's filename and top-level element summary. ${EXT_NOTE}`,
    {},
    async () => {
      try {
        const data = await client.getProjectInfo();
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return toolError(`Failed to get project info: ${formatError(error)}`);
      }
    },
  );

  server.tool(
    "save_project",
    `Save the current StarUML project. If filename is given, saves to that path. Otherwise saves to current path. ${EXT_NOTE}`,
    {
      filename: z
        .string()
        .optional()
        .describe("Optional absolute path. If omitted, saves to current project path."),
    },
    async ({ filename }) => {
      try {
        const data = await client.saveProject(filename);
        return { content: [{ type: "text", text: `Saved: ${JSON.stringify(data)}` }] };
      } catch (error) {
        return toolError(`Failed to save project: ${formatError(error)}`);
      }
    },
  );

  server.tool(
    "save_project_as",
    `Save the current StarUML project to a new path. ${EXT_NOTE}`,
    {
      filename: z.string().min(1).describe("Absolute path for the .mdj file"),
    },
    async ({ filename }) => {
      try {
        const data = await client.saveProjectAs(filename);
        return { content: [{ type: "text", text: `Saved as: ${JSON.stringify(data)}` }] };
      } catch (error) {
        return toolError(`Failed to save project as: ${formatError(error)}`);
      }
    },
  );

  server.tool(
    "new_project",
    `Create a new empty StarUML project (discards unsaved changes in current project). ${EXT_NOTE}`,
    {},
    async () => {
      try {
        await client.newProject();
        return { content: [{ type: "text", text: "New project created." }] };
      } catch (error) {
        return toolError(`Failed to create new project: ${formatError(error)}`);
      }
    },
  );

  server.tool(
    "open_project",
    `Open a StarUML project file (.mdj). ${EXT_NOTE}`,
    {
      filename: z.string().min(1).describe("Absolute path to the .mdj project file"),
    },
    async ({ filename }) => {
      try {
        const data = await client.openProject(filename);
        return { content: [{ type: "text", text: `Opened: ${JSON.stringify(data)}` }] };
      } catch (error) {
        return toolError(`Failed to open project: ${formatError(error)}`);
      }
    },
  );

  server.tool(
    "get_element_by_id",
    `Retrieve a model element by its internal ID. ${EXT_NOTE}`,
    {
      id: z.string().min(1).describe("Element _id as stored in the StarUML repository"),
    },
    async ({ id }) => {
      try {
        const data = await client.getElementById(id);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return toolError(`Failed to get element: ${formatError(error)}`);
      }
    },
  );

  server.tool(
    "find_elements",
    `Find elements by metamodel type and/or name. Examples: type='UMLClass', name='User'. Omit both to return all. ${EXT_NOTE}`,
    {
      type: z
        .string()
        .optional()
        .describe("Metamodel type. Examples: 'Project', 'UMLModel', 'UMLClass', 'UMLPackage'"),
      name: z.string().optional().describe("Exact name match"),
    },
    async ({ type, name }) => {
      try {
        const data = await client.findElements({ type, name });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return toolError(`Failed to find elements: ${formatError(error)}`);
      }
    },
  );

  server.tool(
    "create_element",
    `Create a new UML model element. The 'type' is a metamodel class name (e.g. 'UMLClass', 'UMLPackage', 'UMLInterface'). ${EXT_NOTE}`,
    {
      type: z.string().min(1).describe("Metamodel type, e.g. 'UMLClass', 'UMLPackage'"),
      parentId: z.string().min(1).describe("Parent element's _id"),
      name: z.string().optional().describe("Optional element name"),
    },
    async ({ type, parentId, name }) => {
      try {
        const data = await client.createElement({ type, parentId, name });
        return { content: [{ type: "text", text: `Created: ${JSON.stringify(data, null, 2)}` }] };
      } catch (error) {
        return toolError(`Failed to create element: ${formatError(error)}`);
      }
    },
  );

  server.tool(
    "update_element",
    `Set a property on an existing element. ${EXT_NOTE}`,
    {
      id: z.string().min(1).describe("Element _id"),
      field: z.string().min(1).describe("Property name, e.g. 'name', 'documentation', 'visibility'"),
      value: z.unknown().describe("New value"),
    },
    async ({ id, field, value }) => {
      try {
        const data = await client.updateElement({ id, field, value });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return toolError(`Failed to update element: ${formatError(error)}`);
      }
    },
  );

  server.tool(
    "delete_element",
    `Delete an element from the project. ${EXT_NOTE}`,
    {
      id: z.string().min(1).describe("Element _id to delete"),
    },
    async ({ id }) => {
      try {
        const data = await client.deleteElement(id);
        return { content: [{ type: "text", text: JSON.stringify(data) }] };
      } catch (error) {
        return toolError(`Failed to delete element: ${formatError(error)}`);
      }
    },
  );

  server.tool(
    "create_diagram",
    `Create a typed UML diagram. The 'type' is a metamodel class name (e.g. 'UMLClassDiagram', 'UMLUseCaseDiagram', 'UMLSequenceDiagram', 'UMLActivityDiagram', 'ERDDiagram'). Unlike generate_diagram (Mermaid), this gives a native empty diagram you can populate via create_element. ${EXT_NOTE}`,
    {
      type: z
        .string()
        .min(1)
        .describe(
          "Diagram metamodel type: 'UMLClassDiagram', 'UMLUseCaseDiagram', 'UMLSequenceDiagram', 'UMLActivityDiagram', 'UMLStateDiagram', 'UMLComponentDiagram', 'UMLDeploymentDiagram', 'ERDDiagram'",
        ),
      parentId: z.string().min(1).describe("Parent element's _id (usually the project or a package)"),
      name: z.string().optional().describe("Diagram name"),
    },
    async ({ type, parentId, name }) => {
      try {
        const data = await client.createDiagram({ type, parentId, name });
        return {
          content: [{ type: "text", text: `Created diagram: ${JSON.stringify(data, null, 2)}` }],
        };
      } catch (error) {
        return toolError(`Failed to create diagram: ${formatError(error)}`);
      }
    },
  );

  server.tool(
    "switch_diagram",
    `Focus (open tab) a diagram by its ID. ${EXT_NOTE}`,
    {
      id: z.string().min(1).describe("Diagram _id"),
    },
    async ({ id }) => {
      try {
        const data = await client.switchDiagram(id);
        return { content: [{ type: "text", text: JSON.stringify(data) }] };
      } catch (error) {
        return toolError(`Failed to switch diagram: ${formatError(error)}`);
      }
    },
  );

  server.tool(
    "close_diagram",
    `Close a diagram tab by its ID. ${EXT_NOTE}`,
    {
      id: z.string().min(1).describe("Diagram _id"),
    },
    async ({ id }) => {
      try {
        const data = await client.closeDiagram(id);
        return { content: [{ type: "text", text: JSON.stringify(data) }] };
      } catch (error) {
        return toolError(`Failed to close diagram: ${formatError(error)}`);
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
