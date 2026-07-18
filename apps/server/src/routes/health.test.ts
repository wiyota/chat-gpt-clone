import { describe, it, expect } from "vitest";
import { healthRoute } from "./health.js";

describe("healthRoute", () => {
  it("returns ok", async () => {
    const res = await healthRoute.request("/");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
