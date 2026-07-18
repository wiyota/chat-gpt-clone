import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env.js";
import { chatRoute } from "./routes/chat.js";
import { healthRoute } from "./routes/health.js";

export function createApp() {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: env.CORS_ORIGIN as string,
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  );

  app.route("/health", healthRoute);
  app.route("/api/chat", chatRoute);

  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "Internal server error" }, 500);
  });

  return app;
}
