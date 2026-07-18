import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env.js";
import { chatRoute } from "./routes/chat.js";
import { conversationsRoute } from "./routes/conversations.js";
import { healthRoute } from "./routes/health.js";
import { messagesRoute } from "./routes/messages.js";
import { titleRoute } from "./routes/title.js";

export function createApp() {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: env.CORS_ORIGIN as string,
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  );

  app.route("/health", healthRoute);
  app.route("/api/chat", chatRoute);
  app.route("/api/conversations", conversationsRoute);
  app.route("/api/conversations/:id/messages", messagesRoute);
  app.route("/api/conversations/:id/title", titleRoute);

  app.onError((err, c) => {
    const status = "status" in err && typeof err.status === "number" ? err.status : 500;
    const message = err instanceof Error ? err.message : "Internal server error";

    console.error(err);

    const safeStatus = status >= 400 && status < 600 ? status : 500;
    return c.json({ error: message }, safeStatus as Parameters<typeof c.json>[1]);
  });

  return app;
}
