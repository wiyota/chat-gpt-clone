import { Hono } from "hono";
import { authMiddleware } from "../auth/middleware.js";
import { createUserClient } from "../supabase/client.js";

export const messagesRoute = new Hono().use(authMiddleware).get("/", async (c) => {
  const conversationId = c.req.param("id");
  const token = c.req.header("Authorization")!.replace("Bearer ", "");
  const supabase = createUserClient(token);

  const { data, error } = await supabase
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("load messages error:", error);
    return c.json({ error: "Failed to load messages" }, 500);
  }

  return c.json({ messages: data ?? [] });
});
