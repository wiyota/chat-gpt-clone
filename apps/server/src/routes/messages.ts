import { Hono } from "hono";
import { authMiddleware } from "../auth/middleware.js";
import { createUserClient } from "../supabase/client.js";
import { MAX_MESSAGES_PER_LOAD } from "../db/messages.js";

// Only user and assistant turns are safe for the client to render and echo
// back to /api/chat. System and tool messages are generated server-side, and
// empty content fails the chat request schema, so keep them out of the API
// response.
function isClientMessage(
  message: Record<string, unknown>,
): message is { role: "user" | "assistant"; content: string; created_at: string } {
  const role = message.role;
  const content = typeof message.content === "string" ? message.content.trim() : "";
  return (role === "user" || role === "assistant") && content.length > 0;
}

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

  const messages = (data ?? []).filter(isClientMessage).reverse();

  return c.json({ messages });
});
