import { Type, type TSchema } from "@sinclair/typebox";

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: TSchema;
  };
}

export const getCurrentTimeTool: ToolDefinition = {
  type: "function",
  function: {
    name: "getCurrentTime",
    description: "Return the current date and time as an ISO 8601 string.",
    parameters: Type.Object({}),
  },
};

export const calculatorTool: ToolDefinition = {
  type: "function",
  function: {
    name: "calculator",
    description:
      "Evaluate a simple arithmetic expression containing numbers, +, -, *, /, and parentheses.",
    parameters: Type.Object({
      expression: Type.String({
        description: "Arithmetic expression to evaluate, e.g. '123 * 456'.",
      }),
    }),
  },
};

export const availableTools: ToolDefinition[] = [getCurrentTimeTool, calculatorTool];
