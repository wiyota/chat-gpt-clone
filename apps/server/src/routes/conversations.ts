import { Hono } from "hono";
import { authMiddleware } from "../auth/middleware.js";
import { createUserClient } from "../supabase/client.js";

function getBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token, ...rest] = header.split(" ");
  if (scheme !== "Bearer" || !token || rest.length > 0) return null;
  return token;
}

export const conversationsRoute = new Hono()
  .use(authMiddleware)
  .get("/", async (c) => {
    const auth = c.get("auth");
    const token = getBearerToken(c.req.header("Authorization"));
    if (!token) {
      return c.json({ error: "Invalid Authorization header" }, 401);
    }
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
    const token = getBearerToken(c.req.header("Authorization"));
    if (!token) {
      return c.json({ error: "Invalid Authorization header" }, 401);
    }
    const supabase = createUserClient(token);

    // Verify ownership before deleting. The RLS policy also enforces this, but
    // checking here lets us return a clear 404 when the conversation does not
    // exist or does not belong to the user.
    const { data: conversation, error: fetchError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", auth.userId)
      .maybeSingle();

    if (fetchError) {
      console.error("delete conversation ownership check error:", fetchError);
      return c.json({ error: "Failed to delete conversation" }, 500);
    }

    if (!conversation) {
      return c.json({ error: "Conversation not found or access denied" }, 404);
    }

    const { error } = await supabase.from("conversations").delete().eq("id", id);

    if (error) {
      console.error("delete conversation error:", error);
      return c.json({ error: "Failed to delete conversation" }, 500);
    }

    return c.json({ success: true });
  });
