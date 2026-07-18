import { tbValidator } from "@hono/typebox-validator";
import { Type } from "@sinclair/typebox";
import { Hono } from "hono";
import type { ChatRequest } from "@chat/shared";
import { createLLMProvider } from "../llm/index.js";

const chatSchema = Type.Object({
  messages: Type.Array(
    Type.Object({
      role: Type.Union([
        Type.Literal("system"),
        Type.Literal("user"),
        Type.Literal("assistant"),
        Type.Literal("tool"),
      ]),
      content: Type.String(),
      tool_calls: Type.Optional(Type.Array(Type.Unknown())),
      tool_call_id: Type.Optional(Type.String()),
    }),
  ),
});

export const chatRoute = new Hono().post("/", tbValidator("json", chatSchema), async (c) => {
  const { messages } = c.req.valid("json") as ChatRequest;
  const provider = createLLMProvider();
  const content = await provider.chat(messages);

  return c.json({ content });
});
