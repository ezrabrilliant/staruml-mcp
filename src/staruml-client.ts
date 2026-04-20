import { z } from "zod";

const DEFAULT_HOST = "http://localhost";
const DEFAULT_API_PORT = 58321;

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
}

export class StarUMLClient {
  private readonly baseUrl: string;

  constructor(options: StarUMLClientOptions = {}) {
    const host = options.host ?? DEFAULT_HOST;
    const port = options.port ?? DEFAULT_API_PORT;
    this.baseUrl = `${host}:${port}`;
  }

  async generateDiagram(code: string): Promise<void> {
    await this.call("/generate_diagram", { code });
  }

  async getAllDiagramsInfo(): Promise<unknown> {
    return this.call("/get_all_diagrams_info", {});
  }

  async getCurrentDiagramInfo(): Promise<unknown> {
    return this.call("/get_current_diagram_info", {});
  }

  async getDiagramImageById(diagramId: string): Promise<string> {
    const result = await this.call("/get_diagram_image_by_id", { diagramId });
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

  private async call(slug: string, body: Record<string, unknown>): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new StarUMLApiError(
        `Failed to reach StarUML API at ${this.baseUrl}. Is StarUML running with apiServer enabled? (${String(error)})`,
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
      throw new StarUMLApiError(json.error ?? `Unknown error from StarUML API (${slug})`, slug);
    }

    return json.data;
  }
}
