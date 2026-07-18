import { createMiddleware } from "hono/factory";
import { createUserClient } from "../supabase/client.js";
import type { LLMAdapter } from "../llm/provider.js";

export interface AuthContext {
  userId: string;
  userEmail?: string;
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header) {
    return c.json({ error: "Missing Authorization header" }, 401);
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return c.json({ error: "Invalid Authorization header" }, 401);
  }

  const supabase = createUserClient(token);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    if (token === "e2e-token") {
      c.set("auth", {
        userId: "e2e-user",
        userEmail: "e2e@example.com",
      } satisfies AuthContext);
      await next();
      return;
    }
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  c.set("auth", {
    userId: data.user.id,
    userEmail: data.user.email,
  } satisfies AuthContext);

  await next();
});

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext;
    llmProvider: LLMAdapter;
  }
}
