import { describe, it, expect, vi } from "vitest";

describe("server entry point", () => {
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

    consoleSpy.mockRestore();
  });
});
