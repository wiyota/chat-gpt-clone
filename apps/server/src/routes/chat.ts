import { tbValidator } from "@hono/typebox-validator";
import { Type } from "@sinclair/typebox";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import type { StreamingApi } from "hono/utils/stream";
import type { ChatRequest, Message } from "@chat/shared";
import { authMiddleware } from "../auth/middleware.js";
import { createUserClient } from "../supabase/client.js";
import { findOrCreateConversation } from "../db/conversations.js";
import { insertMessage } from "../db/messages.js";
import { buildContext } from "../context/buildContext.js";
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

    const conversation = await findOrCreateConversation(supabase, auth.userId, conversationId);
    if (!conversation) {
      return c.json({ error: "Failed to create or access conversation" }, 500);
    }

    const userMessage = messages[messages.length - 1];
    if (userMessage) {
      await insertMessage(supabase, conversation.id, userMessage);
    }

    const contextMessages = await buildContext(supabase, conversation.id);

    return stream(c, async (stream: StreamingApi) => {
      c.header("Content-Type", "text/event-stream");
      c.header("Cache-Control", "no-cache");
      c.header("X-Accel-Buffering", "no");
      c.header("Content-Encoding", "identity");

      const signal = c.req.raw.signal;
      const provider = createLLMProvider();
      const streamChunks = provider.chatStream(contextMessages, signal);

      let fullContent = "";
      let aborted = false;

      try {
        await stream.write(`data: conversationId:${conversation.id}\n\n`);
      } catch {
        // Client disconnected before the stream started.
        return;
      }

      try {
        for await (const chunk of streamChunks) {
          if (signal.aborted) {
            aborted = true;
            break;
          }
          if (chunk.content) {
            fullContent += chunk.content;
            await stream.write(`data: ${chunk.content}\n\n`);
          }
        }
        if (!aborted) {
          await stream.write("data: [DONE]\n\n");
        }
      } catch (err) {
        console.error("streaming error:", err);
        try {
          await stream.write("data: [ERROR]\n\n");
        } catch {
          // Client already disconnected.
        }
      } finally {
        if (fullContent) {
          const assistantMessage: Message = {
            role: "assistant",
            content: fullContent,
          };
          await insertMessage(supabase, conversation.id, assistantMessage);
        }
        try {
          await stream.write(`data: conversationId:${conversation.id}\n\n`);
        } catch {
          // Client already disconnected.
        }
      }
    });
  });
