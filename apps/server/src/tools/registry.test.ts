import { describe, it, expect } from "vitest";
import { executeToolCall } from "./registry.js";

describe("executeToolCall", () => {
  it("executes getCurrentTime and returns an ISO string", async () => {
    const result = await executeToolCall({
      id: "call_1",
      function: { name: "getCurrentTime", arguments: "{}" },
    });
    expect(result.tool_call_id).toBe("call_1");
    expect(new Date(result.content).toISOString()).toBe(result.content);
  });

  it("executes calculator with a valid expression", async () => {
    const result = await executeToolCall({
      id: "call_2",
      function: { name: "calculator", arguments: JSON.stringify({ expression: "2 + 3 * 4" }) },
    });
    expect(result.content).toBe("14");
  });

  it("supports parentheses", async () => {
    const result = await executeToolCall({
      id: "call_paren",
      function: { name: "calculator", arguments: JSON.stringify({ expression: "(2 + 3) * 4" }) },
    });
    expect(result.content).toBe("20");
  });

  it("supports decimal numbers", async () => {
    const result = await executeToolCall({
      id: "call_decimal",
      function: { name: "calculator", arguments: JSON.stringify({ expression: "3.5 * 2" }) },
    });
    expect(result.content).toBe("7");
  });

  it("supports negative results", async () => {
    const result = await executeToolCall({
      id: "call_negative",
      function: { name: "calculator", arguments: JSON.stringify({ expression: "5 - 10" }) },
    });
    expect(result.content).toBe("-5");
  });

  it("supports nested parentheses", async () => {
    const result = await executeToolCall({
      id: "call_nested",
      function: {
        name: "calculator",
        arguments: JSON.stringify({ expression: "((1 + 2) * (3 + 4)) / 7" }),
      },
    });
    expect(result.content).toBe("3");
  });

  it("returns an error for an unknown tool", async () => {
    const result = await executeToolCall({
      id: "call_3",
      function: { name: "unknown", arguments: "{}" },
    });
    expect(result.content).toContain("Unknown tool");
  });

  it("returns an error for invalid JSON arguments", async () => {
    const result = await executeToolCall({
      id: "call_4",
      function: { name: "calculator", arguments: "not json" },
    });
    expect(result.content).toContain("not valid JSON");
  });

  it("returns an error for a schema violation", async () => {
    const result = await executeToolCall({
      id: "call_5",
      function: { name: "calculator", arguments: JSON.stringify({ expr: "1+1" }) },
    });
    expect(result.content).toContain("Invalid tool arguments");
  });

  it("returns an error for an invalid calculator expression", async () => {
    const result = await executeToolCall({
      id: "call_6",
      function: { name: "calculator", arguments: JSON.stringify({ expression: "alert(1)" }) },
    });
    expect(result.content).toContain("Tool execution failed");
    expect(result.content).toContain("Invalid calculator expression");
  });

  it("returns an error for unbalanced parentheses", async () => {
    const result = await executeToolCall({
      id: "call_unbalanced",
      function: { name: "calculator", arguments: JSON.stringify({ expression: "(1 + 2" }) },
    });
    expect(result.content).toContain("Unbalanced parentheses");
  });

  it("returns an error for operator-only input", async () => {
    const result = await executeToolCall({
      id: "call_operators",
      function: { name: "calculator", arguments: JSON.stringify({ expression: "+ - *" }) },
    });
    expect(result.content).toContain("Invalid calculator expression");
  });
});
