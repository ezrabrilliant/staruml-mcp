import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StarUMLClient } from "../src/staruml-client.js";

describe("StarUMLClient", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockJsonResponse(body: unknown, status = 200): void {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  describe("constructor", () => {
    it("uses default host and port when no options given", () => {
      const client = new StarUMLClient();
      mockJsonResponse({ success: true });
      void client.generateDiagram("flowchart LR\n  A --> B");
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://localhost:58321/generate_diagram",
        expect.any(Object),
      );
    });

    it("uses custom host and port when provided", () => {
      const client = new StarUMLClient({ host: "http://example.com", port: 1234 });
      mockJsonResponse({ success: true });
      void client.generateDiagram("flowchart LR\n  A --> B");
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://example.com:1234/generate_diagram",
        expect.any(Object),
      );
    });
  });

  describe("generateDiagram", () => {
    it("sends POST with correct body shape", async () => {
      const client = new StarUMLClient();
      const code = "erDiagram\n  USER ||--o{ ORDER : places";
      mockJsonResponse({ success: true });

      await client.generateDiagram(code);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0]!;
      expect(url).toBe("http://localhost:58321/generate_diagram");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({ "Content-Type": "application/json" });
      expect(JSON.parse(init?.body as string)).toEqual({ code });
    });

    it("throws StarUMLApiError when response.success is false", async () => {
      const client = new StarUMLClient();
      mockJsonResponse({ success: false, error: "Invalid Mermaid syntax" });

      await expect(client.generateDiagram("invalid")).rejects.toMatchObject({
        name: "StarUMLApiError",
        slug: "/generate_diagram",
        message: expect.stringContaining("Invalid Mermaid syntax"),
      });
    });

    it("throws StarUMLApiError with status when HTTP not ok", async () => {
      const client = new StarUMLClient();
      fetchSpy.mockResolvedValueOnce(new Response("Server error", { status: 500 }));

      await expect(client.generateDiagram("x")).rejects.toMatchObject({
        slug: "/generate_diagram",
        status: 500,
      });
    });

    it("throws StarUMLApiError with helpful message when fetch itself fails", async () => {
      const client = new StarUMLClient();
      fetchSpy.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      await expect(client.generateDiagram("x")).rejects.toMatchObject({
        slug: "/generate_diagram",
        message: expect.stringContaining("Is StarUML running"),
      });
    });
  });

  describe("getAllDiagramsInfo", () => {
    it("returns data field from response", async () => {
      const client = new StarUMLClient();
      const diagrams = [{ id: "d1", name: "Flow", type: "flowchart" }];
      mockJsonResponse({ success: true, data: diagrams });

      const result = await client.getAllDiagramsInfo();

      expect(result).toEqual(diagrams);
    });
  });

  describe("getCurrentDiagramInfo", () => {
    it("returns data field from response", async () => {
      const client = new StarUMLClient();
      mockJsonResponse({ success: true, data: { id: "x", name: "Current" } });

      const result = await client.getCurrentDiagramInfo();

      expect(result).toEqual({ id: "x", name: "Current" });
    });

    it("returns undefined when data is absent", async () => {
      const client = new StarUMLClient();
      mockJsonResponse({ success: true });

      const result = await client.getCurrentDiagramInfo();

      expect(result).toBeUndefined();
    });
  });

  describe("getDiagramImageById", () => {
    it("returns the image string from data", async () => {
      const client = new StarUMLClient();
      mockJsonResponse({ success: true, data: "iVBORw0KGgo=" });

      const result = await client.getDiagramImageById("d1");

      expect(result).toBe("iVBORw0KGgo=");
    });

    it("throws when data is not a string", async () => {
      const client = new StarUMLClient();
      mockJsonResponse({ success: true, data: { wrong: "shape" } });

      await expect(client.getDiagramImageById("d1")).rejects.toThrow(/Expected image string/);
    });
  });

  describe("ping", () => {
    it("returns true when HTTP 200", async () => {
      const client = new StarUMLClient();
      fetchSpy.mockResolvedValueOnce(new Response("OK", { status: 200 }));

      await expect(client.ping()).resolves.toBe(true);
    });

    it("returns false when HTTP not ok", async () => {
      const client = new StarUMLClient();
      fetchSpy.mockResolvedValueOnce(new Response("Not found", { status: 404 }));

      await expect(client.ping()).resolves.toBe(false);
    });

    it("returns false when fetch throws", async () => {
      const client = new StarUMLClient();
      fetchSpy.mockRejectedValueOnce(new Error("network down"));

      await expect(client.ping()).resolves.toBe(false);
    });
  });
});
