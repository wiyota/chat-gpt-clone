import { Hono } from "hono";
import { tbValidator } from "@hono/typebox-validator";
import { Type } from "@sinclair/typebox";
import { authMiddleware } from "../auth/middleware.js";
import { createUserClient } from "../supabase/client.js";
import { generateTitle, updateConversationTitle } from "../db/title.js";
import { createLLMProvider } from "../llm/index.js";

const titleBodySchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
});

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
      .select("id")
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
      const provider = createLLMProvider();
      title = await generateTitle(provider, supabase, id);
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
