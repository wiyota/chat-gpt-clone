import { Hono } from "hono";
import { authMiddleware } from "../auth/middleware.js";
import { createUserClient } from "../supabase/client.js";
import { generateTitle, updateConversationTitle } from "../db/title.js";
import { createLLMProvider } from "../llm/index.js";
import { tbValidator } from "@hono/typebox-validator";
import { Type } from "@sinclair/typebox";

const titleBodySchema = Type.Object({
  title: Type.Optional(Type.String()),
});

export const titleRoute = new Hono()
  .use(authMiddleware)
  .post("/", tbValidator("json", titleBodySchema), async (c) => {
    const auth = c.get("auth");
    const id = c.req.param("id");
    if (!id) {
      return c.json({ error: "Conversation ID is required" }, 400);
    }
    const token = c.req.header("Authorization")!.replace("Bearer ", "");
    const supabase = createUserClient(token);

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
