import { describe, it, expect } from "vitest";
import { getCurrentTimeTool, calculatorTool, availableTools } from "./definitions.js";
import { Type } from "@sinclair/typebox";

describe("tool definitions", () => {
  it("exposes the current time tool", () => {
    expect(getCurrentTimeTool).toEqual({
      type: "function",
      function: {
        name: "getCurrentTime",
        description: "Return the current date and time as an ISO 8601 string.",
        parameters: Type.Object({}),
      },
    });
  });

  it("exposes the calculator tool with a string expression parameter", () => {
    expect(calculatorTool.type).toBe("function");
    expect(calculatorTool.function.name).toBe("calculator");
    expect(calculatorTool.function.description).toContain("arithmetic expression");
    expect(calculatorTool.function.parameters).toBeDefined();
  });

  it("includes all available tools in the exported list", () => {
    const names = availableTools.map((tool) => tool.function.name);
    expect(names).toContain("getCurrentTime");
    expect(names).toContain("calculator");
    expect(availableTools.length).toBeGreaterThanOrEqual(2);
  });

  it("uses TypeBox schemas for parameters", () => {
    for (const tool of availableTools) {
      expect(tool.function.parameters).toBeDefined();
      const schema = tool.function.parameters as unknown as Record<symbol, unknown>;
      const hasKind = Object.getOwnPropertySymbols(schema).some(
        (symbol) => symbol.toString() === "Symbol(TypeBox.Kind)",
      );
      expect(hasKind).toBe(true);
    }
  });
});
