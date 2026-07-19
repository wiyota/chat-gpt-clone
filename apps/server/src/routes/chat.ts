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
import type { LLMAdapter } from "../llm/provider.js";
import { extractFacts } from "../memory/extractFacts.js";
import { checkDailyBudget } from "../usage/limit.js";
import { getToolDefinitions, executeToolCall } from "../tools/registry.js";
import { env } from "../env.js";

const MAX_CHAT_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 10_000;

const chatSchema = Type.Object({
  messages: Type.Array(
    Type.Object({
      // Only user and assistant roles may be supplied by the client. System and
      // tool messages are generated server-side to prevent prompt injection or
      // forged tool results.
      role: Type.Union([Type.Literal("user"), Type.Literal("assistant")]),
      content: Type.String({ minLength: 1, maxLength: MAX_MESSAGE_LENGTH }),
      tool_calls: Type.Optional(Type.Array(Type.Unknown())),
      tool_call_id: Type.Optional(Type.String()),
    }),
    { maxItems: MAX_CHAT_MESSAGES },
  ),
  conversationId: Type.Optional(Type.String()),
});

function getBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token, ...rest] = header.split(" ");
  if (scheme !== "Bearer" || !token || rest.length > 0) return null;
  return token;
}

async function verifyConversationOwner(
  supabase: ReturnType<typeof createUserClient>,
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("verifyConversationOwner error:", error);
    return false;
  }

  return !!data;
}

async function persistFacts(
  provider: LLMAdapter,
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

    const token = getBearerToken(c.req.header("Authorization"));
    if (!token) {
      return c.json({ error: "Invalid Authorization header" }, 401);
    }

    const supabase = createUserClient(token);
    const adminSupabase = createAdminClient();

    // When reusing an existing conversation, verify the current user owns it
    // before reading or appending any messages.
    if (conversationId) {
      const isOwner = await verifyConversationOwner(supabase, conversationId, auth.userId);
      if (!isOwner) {
        return c.json({ error: "Conversation not found or access denied" }, 404);
      }
    }

    const userMessage = messages[messages.length - 1];
    const initialTitle = userMessage?.content.slice(0, 50);

    const conversation = await findOrCreateConversation(
      supabase,
      auth.userId,
      conversationId,
      initialTitle,
    );
    if (!conversation) {
      return c.json({ error: "Failed to create or access conversation" }, 500);
    }

    // Defense in depth: ensure the returned conversation belongs to this user.
    if (conversation.user_id !== auth.userId) {
      return c.json({ error: "Conversation not found or access denied" }, 404);
    }

    if (userMessage) {
      await insertMessage(supabase, conversation.id, userMessage);
    }

    const provider = c.get("llmProvider") ?? createLLMProvider();

    // Extract facts in the background so streaming starts immediately.
    const factTask =
      userMessage?.role === "user"
        ? persistFacts(provider, supabase, auth.userId, userMessage.content)
        : Promise.resolve();

    const contextMessages = await buildContext(supabase, conversation.id, auth.userId, provider);

    const toolDefinitions = getToolDefinitions();
    const messagesForModel: Message[] = [...contextMessages];
    let toolRounds = 0;
    const maxToolRounds = 3;

    const estimatedTokens = provider.countTokens([
      ...messagesForModel,
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
      let finalAssistantContent = "";
      let aborted = false;

      try {
        await stream.write(`data: conversationId:${conversation.id}\n\n`);
      } catch {
        // Client disconnected before the stream started.
        return;
      }

      try {
        while (toolRounds < maxToolRounds) {
          const streamChunks = provider.chatStream(messagesForModel, signal, toolDefinitions);
          let roundContent = "";
          let roundToolCalls:
            | { id: string; type: "function"; function: { name: string; arguments: string } }[]
            | undefined;

          for await (const chunk of streamChunks) {
            if (signal.aborted) {
              aborted = true;
              break;
            }
            if (chunk.content) {
              const lines = chunk.content.split(/\r?\n/).filter((line) => line.length > 0);
              for (const line of lines) {
                await stream.write(`data: ${line}\n`);
              }
              if (lines.length > 0) {
                await stream.write("\n");
              }
              roundContent += lines.join("\n");
            }
            if (chunk.tool_calls && chunk.tool_calls.length > 0) {
              roundToolCalls = chunk.tool_calls;
              break;
            }
          }

          if (roundToolCalls) {
            // Persist the assistant turn that requested tools, plus each tool result.
            messagesForModel.push({
              role: "assistant",
              content: roundContent,
              tool_calls: roundToolCalls,
            });
            await insertMessage(supabase, conversation.id, {
              role: "assistant",
              content: roundContent,
              tool_calls: roundToolCalls,
            });

            for (const call of roundToolCalls) {
              const result = await executeToolCall({
                id: call.id,
                function: {
                  name: call.function.name,
                  arguments: call.function.arguments,
                },
              });
              const toolMessage: Message = {
                role: "tool",
                content: result.content,
                tool_call_id: result.tool_call_id,
              };
              messagesForModel.push(toolMessage);
              await insertMessage(supabase, conversation.id, toolMessage);
            }

            toolRounds++;
            continue;
          }

          // No tool calls in this round: this is the final answer.
          finalAssistantContent = roundContent;
          break;
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
        if (finalAssistantContent) {
          const assistantMessage: Message = {
            role: "assistant",
            content: finalAssistantContent,
          };
          await insertMessage(supabase, conversation.id, assistantMessage);
        }

        const promptTokens = provider.countTokens(messagesForModel);
        const completionTokens = provider.countTokens([
          { role: "assistant", content: finalAssistantContent },
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
