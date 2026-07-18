import { describe, it, expect } from "vitest";
import { sanitizeTitle } from "./title.js";

describe("sanitizeTitle", () => {
  it("trims whitespace and surrounding quotes", () => {
    expect(sanitizeTitle(`  "Hello world"  `)).toBe("Hello world");
  });

  it("replaces newlines with spaces", () => {
    expect(sanitizeTitle("Line 1\nLine 2")).toBe("Line 1 Line 2");
  });

  it("truncates to 50 characters", () => {
    const long = "a".repeat(100);
    expect(sanitizeTitle(long)).toBe("a".repeat(50));
  });

  it("returns default title when result is empty", () => {
    expect(sanitizeTitle('"""')).toBe("New conversation");
  });

  it("returns default title for whitespace-only input", () => {
    expect(sanitizeTitle("   \n   ")).toBe("New conversation");
  });
});
