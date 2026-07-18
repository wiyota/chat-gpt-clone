import { tbValidator } from "@hono/typebox-validator";
import { Type } from "@sinclair/typebox";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import type { StreamingApi } from "hono/utils/stream";
import type { ChatRequest, Message } from "@chat/shared";
import { authMiddleware } from "../auth/middleware.js";
import { createUserClient, createAdminClient } from "../supabase/client.js";
import { findOrCreateConversation } from "../db/conversations.js";
import { insertMessage } from "../db/messages.js";
import { insertUsage } from "../db/usage.js";
import { loadMemories, insertMemory } from "../db/memories.js";
import { buildContext } from "../context/buildContext.js";
import { createLLMProvider } from "../llm/index.js";
import { extractFacts } from "../memory/extractFacts.js";
import { checkDailyBudget } from "../usage/limit.js";
import { env } from "../env.js";

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

async function persistFacts(
  provider: ReturnType<typeof createLLMProvider>,
  supabase: ReturnType<typeof createUserClient>,
  userId: string,
  userText: string,
): Promise<void> {
  try {
    const existingMemories = await loadMemories(supabase, userId, env.MEMORY_MAX_FACTS);
    const existingFacts = new Set(existingMemories.map((m) => m.fact));
    const facts = await extractFacts(provider, userText);
    for (const fact of facts) {
      if (!existingFacts.has(fact)) {
        await insertMemory(supabase, userId, fact);
        existingFacts.add(fact);
      }
    }
  } catch (err) {
    console.error("persistFacts error:", err);
  }
}

export const chatRoute = new Hono()
  .use(authMiddleware)
  .post("/", tbValidator("json", chatSchema), async (c) => {
    const auth = c.get("auth");
    const { messages, conversationId } = c.req.valid("json") as ChatRequest & {
      conversationId?: string;
    };

    const token = c.req.header("Authorization")!.replace("Bearer ", "");
    const supabase = createUserClient(token);
    const adminSupabase = createAdminClient();

    const conversation = await findOrCreateConversation(supabase, auth.userId, conversationId);
    if (!conversation) {
      return c.json({ error: "Failed to create or access conversation" }, 500);
    }

    const userMessage = messages[messages.length - 1];
    if (userMessage) {
      await insertMessage(supabase, conversation.id, userMessage);
    }

    const contextMessages = await buildContext(supabase, conversation.id, auth.userId);

    const provider = createLLMProvider();
    const estimatedTokens = provider.countTokens([
      ...contextMessages,
      userMessage ?? { role: "user", content: "" },
    ]);

    const budgetCheck = await checkDailyBudget(supabase, auth.userId, estimatedTokens);
    if (!budgetCheck.allowed) {
      return c.json(
        {
          error: "Daily token budget exceeded",
          code: "quota_exceeded",
          todayUsage: budgetCheck.todayUsage,
          budget: budgetCheck.budget,
        },
        429,
      );
    }

    return stream(c, async (stream: StreamingApi) => {
      c.header("Content-Type", "text/event-stream");
      c.header("Cache-Control", "no-cache");
      c.header("X-Accel-Buffering", "no");
      c.header("Content-Encoding", "identity");

      const signal = c.req.raw.signal;
      const streamChunks = provider.chatStream(contextMessages, signal);

      let fullContent = "";
      let aborted = false;

      // Extract facts in the background so streaming starts immediately.
      const factTask =
        userMessage?.role === "user"
          ? persistFacts(provider, supabase, auth.userId, userMessage.content)
          : Promise.resolve();

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

        const promptTokens = provider.countTokens(contextMessages);
        const completionTokens = provider.countTokens([
          { role: "assistant", content: fullContent },
        ]);
        await insertUsage(adminSupabase, {
          userId: auth.userId,
          conversationId: conversation.id,
          model: env.OPENAI_MODEL as string,
          promptTokens,
          completionTokens,
        });

        await factTask;

        try {
          await stream.write(`data: conversationId:${conversation.id}\n\n`);
        } catch {
          // Client already disconnected.
        }
      }
    });
  });
