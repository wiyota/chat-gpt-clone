import { Hono } from "hono";
import { authMiddleware } from "../auth/middleware.js";
import { createUserClient } from "../supabase/client.js";

export const conversationsRoute = new Hono()
  .use(authMiddleware)
  .get("/", async (c) => {
    const auth = c.get("auth");
    const token = c.req.header("Authorization")!.replace("Bearer ", "");
    const supabase = createUserClient(token);

    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", auth.userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("list conversations error:", error);
      return c.json({ error: "Failed to load conversations" }, 500);
    }

    return c.json({ conversations: data ?? [] });
  })
  .delete("/:id", async (c) => {
    const auth = c.get("auth");
    const id = c.req.param("id");
    const token = c.req.header("Authorization")!.replace("Bearer ", "");
    const supabase = createUserClient(token);

    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.userId);

    if (error) {
      console.error("delete conversation error:", error);
      return c.json({ error: "Failed to delete conversation" }, 500);
    }

    return c.json({ success: true });
  });
