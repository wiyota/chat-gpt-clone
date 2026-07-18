import { Value } from "@sinclair/typebox/value";
import { calculatorTool, getCurrentTimeTool } from "./definitions.js";
import type { ToolDefinition } from "./definitions.js";

export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  tool_call_id: string;
  content: string;
}

export interface ToolExecutor {
  definition: ToolDefinition;
  execute: (args: Record<string, unknown>) => Promise<string> | string;
}

function isValidExpression(expression: string): boolean {
  // Only allow numbers, arithmetic operators, parentheses, decimal points, and whitespace.
  if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
    return false;
  }

  // Reject obviously empty or operator-only input and enforce balanced parentheses.
  if (!/[0-9]/.test(expression)) {
    return false;
  }

  let depth = 0;
  for (const char of expression) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

const registry = new Map<string, ToolExecutor>([
  [
    getCurrentTimeTool.function.name,
    {
      definition: getCurrentTimeTool,
      execute: () => new Date().toISOString(),
    },
  ],
  [
    calculatorTool.function.name,
    {
      definition: calculatorTool,
      execute: (args) => {
        const expression = String(args.expression ?? "");
        if (!isValidExpression(expression)) {
          throw new Error("Invalid calculator expression");
        }
        // Safe math via Function with no access to globals.
        const result = new Function(`return (${expression})`)();
        return String(result);
      },
    },
  ],
]);

export async function executeToolCall(call: ToolCall): Promise<ToolResult> {
  const executor = registry.get(call.function.name);
  if (!executor) {
    return {
      tool_call_id: call.id,
      content: `Unknown tool: ${call.function.name}`,
    };
  }

  let args: Record<string, unknown>;
  try {
    args = JSON.parse(call.function.arguments) as Record<string, unknown>;
  } catch {
    return {
      tool_call_id: call.id,
      content: "Invalid tool arguments: not valid JSON",
    };
  }

  try {
    Value.Assert(executor.definition.function.parameters, args);
  } catch (err) {
    return {
      tool_call_id: call.id,
      content: `Invalid tool arguments: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  try {
    const output = await executor.execute(args);
    return { tool_call_id: call.id, content: output };
  } catch (err) {
    return {
      tool_call_id: call.id,
      content: `Tool execution failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function getToolDefinitions(): ToolDefinition[] {
  return Array.from(registry.values()).map((entry) => entry.definition);
}
