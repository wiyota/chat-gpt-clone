import { Value } from "@sinclair/typebox/value";
import { calculatorTool, getCurrentTimeTool } from "./definitions.js";
import type { ToolDefinition } from "./definitions.js";
import { evaluateExpression } from "./calculator.js";

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
        const result = evaluateExpression(expression);
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
