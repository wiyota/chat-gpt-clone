import { Hono } from "hono";
import { tbValidator } from "@hono/typebox-validator";
import { Type } from "@sinclair/typebox";
import { authMiddleware } from "../auth/middleware.js";
import { createUserClient } from "../supabase/client.js";
import { createAdminClient } from "../supabase/client.js";
import { generateTitle, updateConversationTitle } from "../db/title.js";
import { createLLMProvider } from "../llm/index.js";
import { loadMessages } from "../db/messages.js";
import { checkDailyBudget } from "../usage/limit.js";
import { consumeChatRequest } from "../usage/rateLimit.js";
import { finalizeUsage } from "../db/usage.js";

const titleBodySchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
});

const titleGenerationLocks = new Map<string, Promise<string | null>>();

function getBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token, ...rest] = header.split(" ");
  if (scheme !== "Bearer" || !token || rest.length > 0) return null;
  return token;
}

export const titleRoute = new Hono()
  .use(authMiddleware)
  .post("/", tbValidator("json", titleBodySchema), async (c) => {
    const auth = c.get("auth");
    const id = c.req.param("id");
    if (!id) {
      return c.json({ error: "Conversation ID is required" }, 400);
    }

    const token = getBearerToken(c.req.header("Authorization"));
    if (!token) {
      return c.json({ error: "Invalid Authorization header" }, 401);
    }
    const supabase = createUserClient(token);

    // Verify the conversation belongs to the authenticated user before
    // updating its title.
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id, title")
      .eq("id", id)
      .eq("user_id", auth.userId)
      .maybeSingle();

    if (conversationError) {
      console.error("update title conversation check error:", conversationError);
      return c.json({ error: "Failed to update title" }, 500);
    }

    if (!conversation) {
      return c.json({ error: "Conversation not found or access denied" }, 404);
    }

    const body = c.req.valid("json") as { title?: string };

    let title: string | null;
    if (body.title) {
      title = body.title.trim();
      if (!title) {
        return c.json({ title: "New conversation" });
      }
    } else {
      // Avoid allowing repeated title-generation requests for an already
      // titled conversation to consume provider credits.
      if (typeof conversation.title === "string" && conversation.title !== "New conversation") {
        return c.json({ title: conversation.title });
      }

      const pendingGeneration = titleGenerationLocks.get(id);
      if (pendingGeneration) {
        const pendingTitle = await pendingGeneration;
        return c.json({ title: pendingTitle ?? "New conversation" });
      }

      if (!consumeChatRequest(auth.userId)) {
        return c.json({ error: "Too many requests" }, 429);
      }

      const provider = createLLMProvider();
      const messages = await loadMessages(supabase, id);
      const firstUserMessage = messages.find((message) => message.role === "user");
      if (!firstUserMessage?.content) {
        return c.json({ title: "New conversation" });
      }

      const titlePromptTokens = provider.countTokens([
        {
          role: "system",
          content:
            "You are a helpful assistant generating conversation titles. Generate a short title based only on the user's first message.",
        },
        { role: "user", content: firstUserMessage.content },
      ]);
      const budgetCheck = await checkDailyBudget(supabase, auth.userId, titlePromptTokens + 64);
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

      const generation = generateTitle(provider, supabase, id);
      titleGenerationLocks.set(id, generation);
      try {
        title = await generation;
      } finally {
        titleGenerationLocks.delete(id);
      }
      if (budgetCheck.reservationId) {
        await finalizeUsage(createAdminClient(), budgetCheck.reservationId, {
          model: "title-generation",
          promptTokens: titlePromptTokens,
          completionTokens: provider.countTokens([{ role: "assistant", content: title ?? "" }]),
        });
      }
    }

    if (!title) {
      return c.json({ title: "New conversation" });
    }

    const updated = await updateConversationTitle(supabase, id, title);
    if (!updated) {
      return c.json({ error: "Failed to update title" }, 500);
    }

    return c.json({ title });
  });
