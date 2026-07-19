import { Hono } from "hono";
import { authMiddleware } from "../auth/middleware.js";
import { createUserClient } from "../supabase/client.js";
import { MAX_MESSAGES_PER_LOAD } from "../db/messages.js";

function getBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token, ...rest] = header.split(" ");
  if (scheme !== "Bearer" || !token || rest.length > 0) return null;
  return token;
}

export const messagesRoute = new Hono().use(authMiddleware).get("/", async (c) => {
  const auth = c.get("auth");
  const conversationId = c.req.param("id");

  const token = getBearerToken(c.req.header("Authorization"));
  if (!token) {
    return c.json({ error: "Invalid Authorization header" }, 401);
  }
  const supabase = createUserClient(token);

  // Verify the conversation belongs to the authenticated user before
  // returning any messages.
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (conversationError) {
    console.error("load messages conversation check error:", conversationError);
    return c.json({ error: "Failed to load messages" }, 500);
  }

  if (!conversation) {
    return c.json({ error: "Conversation not found or access denied" }, 404);
  }

  const { data, error } = await supabase
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MAX_MESSAGES_PER_LOAD);

  if (error) {
    console.error("load messages error:", error);
    return c.json({ error: "Failed to load messages" }, 500);
  }

  return c.json({ messages: (data ?? []).reverse() });
});
