import { tbValidator } from "@hono/typebox-validator";
import { Type } from "@sinclair/typebox";
import { Hono } from "hono";
import type { ChatRequest, Message } from "@chat/shared";
import { authMiddleware } from "../auth/middleware.js";
import { createUserClient } from "../supabase/client.js";
import { findOrCreateConversation } from "../db/conversations.js";
import { insertMessage, loadMessages } from "../db/messages.js";
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
    })
  ),
  conversationId: Type.Optional(Type.String()),
});

export const chatRoute = new Hono()
  .use(authMiddleware)
  .post("/", tbValidator("json", chatSchema), async (c) => {
    const auth = c.get("auth");
    const { messages, conversationId } = c.req.valid("json") as ChatRequest & {
      conversationId?: string;
    };

    const token = c.req.header("Authorization")!.replace("Bearer ", "");
    const supabase = createUserClient(token);

    const conversation = await findOrCreateConversation(
      supabase,
      auth.userId,
      conversationId
    );
    if (!conversation) {
      return c.json({ error: "Failed to create or access conversation" }, 500);
    }

    const history = await loadMessages(supabase, conversation.id);
    const userMessage = messages[messages.length - 1];
    if (userMessage) {
      await insertMessage(supabase, conversation.id, userMessage);
    }

    const provider = createLLMProvider();
    const content = await provider.chat([...history, ...messages]);

    const assistantMessage: Message = { role: "assistant", content };
    await insertMessage(supabase, conversation.id, assistantMessage);

    return c.json({ content, conversationId: conversation.id });
  });
