import { Hono } from "hono";
import { authMiddleware } from "../auth/middleware.js";
import { createUserClient } from "../supabase/client.js";
import { generateTitle, updateConversationTitle } from "../db/title.js";
import { createLLMProvider } from "../llm/index.js";

export const titleRoute = new Hono().use(authMiddleware).post("/", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");
  if (!id) {
    return c.json({ error: "Conversation ID is required" }, 400);
  }
  const token = c.req.header("Authorization")!.replace("Bearer ", "");
  const supabase = createUserClient(token);

  const provider = createLLMProvider();
  const title = await generateTitle(provider, supabase, id);

  if (!title) {
    return c.json({ title: "New conversation" });
  }

  const updated = await updateConversationTitle(supabase, id, title);
  if (!updated) {
    return c.json({ error: "Failed to update title" }, 500);
  }

  return c.json({ title });
});
