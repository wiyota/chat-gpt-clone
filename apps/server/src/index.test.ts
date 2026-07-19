import { describe, it, expect, vi, beforeEach } from "vitest";

describe("server entry point", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("calls serve with the app fetch handler and port", async () => {
    const serve = vi.fn();
    vi.doMock("@hono/node-server", () => ({ serve }));

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await import("./index.js");

    expect(serve).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 3000,
      }),
    );
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("logs startup message in development", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const serve = vi.fn();
    vi.doMock("@hono/node-server", () => ({ serve }));

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await import("./index.js");

    expect(serve).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 3000,
      }),
    );
    expect(consoleSpy).toHaveBeenCalledWith("Server is running on http://localhost:3000");

    process.env.NODE_ENV = originalNodeEnv;
    consoleSpy.mockRestore();
  });
});
