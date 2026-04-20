import { z } from "zod";

const DEFAULT_HOST = "http://localhost";
const DEFAULT_API_PORT = 58321;
const DEFAULT_EXT_PORT = 58322;

const StarUMLResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
});

export class StarUMLApiError extends Error {
  constructor(
    message: string,
    public readonly slug: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "StarUMLApiError";
  }
}

export interface StarUMLClientOptions {
  host?: string;
  port?: number;
  extPort?: number;
}

export class StarUMLClient {
  private readonly host: string;
  private readonly baseUrl: string;
  private readonly extUrl: string;

  constructor(options: StarUMLClientOptions = {}) {
    this.host = options.host ?? DEFAULT_HOST;
    const port = options.port ?? DEFAULT_API_PORT;
    const extPort = options.extPort ?? DEFAULT_EXT_PORT;
    this.baseUrl = `${this.host}:${port}`;
    this.extUrl = `${this.host}:${extPort}`;
  }

  // === Built-in StarUML API (port 58321) ===

  async generateDiagram(code: string): Promise<void> {
    await this.callBase("/generate_diagram", { code });
  }

  async getAllDiagramsInfo(): Promise<unknown> {
    return this.callBase("/get_all_diagrams_info", {});
  }

  async getCurrentDiagramInfo(): Promise<unknown> {
    return this.callBase("/get_current_diagram_info", {});
  }

  async getDiagramImageById(diagramId: string): Promise<string> {
    const result = await this.callBase("/get_diagram_image_by_id", { diagramId });
    if (typeof result !== "string") {
      throw new StarUMLApiError(
        "Expected image string, got different type",
        "/get_diagram_image_by_id",
      );
    }
    return result;
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(this.baseUrl, { method: "GET" });
      return res.ok;
    } catch {
      return false;
    }
  }

  // === Extension API (port 58322, requires staruml-mcp-extension installed) ===

  async pingExtension(): Promise<boolean> {
    try {
      const res = await fetch(this.extUrl, { method: "GET" });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getAllCommands(): Promise<unknown> {
    return this.callExt("/get_all_commands", {});
  }

  async executeCommand(id: string, args?: unknown[]): Promise<unknown> {
    return this.callExt("/execute_command", { id, args: args ?? [] });
  }

  async getProjectInfo(): Promise<unknown> {
    return this.callExt("/get_project_info", {});
  }

  async saveProject(filename?: string): Promise<unknown> {
    return this.callExt("/save_project", filename ? { filename } : {});
  }

  async saveProjectAs(filename: string): Promise<unknown> {
    return this.callExt("/save_project_as", { filename });
  }

  async newProject(): Promise<unknown> {
    return this.callExt("/new_project", {});
  }

  async openProject(filename: string): Promise<unknown> {
    return this.callExt("/open_project", { filename });
  }

  async getElementById(id: string): Promise<unknown> {
    return this.callExt("/get_element_by_id", { id });
  }

  async findElements(filter: { type?: string; name?: string } = {}): Promise<unknown> {
    return this.callExt("/find_elements", filter);
  }

  async createElement(input: { type: string; parentId: string; name?: string }): Promise<unknown> {
    return this.callExt("/create_element", input);
  }

  async updateElement(input: { id: string; field: string; value: unknown }): Promise<unknown> {
    return this.callExt("/update_element", input);
  }

  async deleteElement(id: string): Promise<unknown> {
    return this.callExt("/delete_element", { id });
  }

  async createDiagram(input: { type: string; parentId: string; name?: string }): Promise<unknown> {
    return this.callExt("/create_diagram", input);
  }

  async switchDiagram(id: string): Promise<unknown> {
    return this.callExt("/switch_diagram", { id });
  }

  async closeDiagram(id: string): Promise<unknown> {
    return this.callExt("/close_diagram", { id });
  }

  // === Internal ===

  private callBase(slug: string, body: Record<string, unknown>): Promise<unknown> {
    return this.post(this.baseUrl, slug, body, "StarUML built-in API");
  }

  private callExt(slug: string, body: Record<string, unknown>): Promise<unknown> {
    return this.post(
      this.extUrl,
      slug,
      body,
      "staruml-mcp-extension (install from https://github.com/ezrabrilliant/staruml-mcp-extension)",
    );
  }

  private async post(
    baseUrl: string,
    slug: string,
    body: Record<string, unknown>,
    hint: string,
  ): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new StarUMLApiError(
        `Failed to reach ${baseUrl}. Is StarUML running? ${hint}. (${String(error)})`,
        slug,
      );
    }

    if (!res.ok) {
      throw new StarUMLApiError(
        `HTTP ${res.status} ${res.statusText} for ${slug}`,
        slug,
        res.status,
      );
    }

    const json = StarUMLResponseSchema.parse(await res.json());

    if (!json.success) {
      throw new StarUMLApiError(json.error ?? `Unknown error from ${baseUrl}${slug}`, slug);
    }

    return json.data;
  }
}
