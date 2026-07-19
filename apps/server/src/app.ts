import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./env.js";
import { chatRoute } from "./routes/chat.js";
import { conversationsRoute } from "./routes/conversations.js";
import { healthRoute } from "./routes/health.js";
import { messagesRoute } from "./routes/messages.js";
import { titleRoute } from "./routes/title.js";
import type { LLMAdapter } from "./llm/provider.js";

export function createApp(options: { llmProvider?: LLMAdapter } = {}) {
  const app = new Hono();

  app.use("*", async (c, next) => {
    // Basic security headers. In production, use a CDN or reverse proxy to add
    // stricter policies (e.g. CSP nonces, HSTS preload).
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
    c.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    await next();
  });

  app.use(
    "*",
    cors({
      origin: env.CORS_ORIGIN as string,
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  );

  app.use("/api/*", async (c, next) => {
    if (options.llmProvider) {
      c.set("llmProvider", options.llmProvider);
    }
    await next();
  });

  app.route("/health", healthRoute);
  app.route("/api/chat", chatRoute);
  app.route("/api/conversations", conversationsRoute);
  app.route("/api/conversations/:id/messages", messagesRoute);
  app.route("/api/conversations/:id/title", titleRoute);

  app.onError((err, c) => {
    const status = "status" in err && typeof err.status === "number" ? err.status : 500;
    const safeStatus = status >= 400 && status < 600 ? status : 500;

    // Only expose internal error details in development/test environments.
    // In production, return a generic message to avoid leaking implementation
    // details, stack traces, or potentially sensitive configuration values.
    const isDevelopment = env.E2E || process.env.NODE_ENV === "development";
    const message = isDevelopment && err instanceof Error ? err.message : "Internal server error";

    console.error(err);

    return c.json({ error: message }, safeStatus as Parameters<typeof c.json>[1]);
  });

  return app;
}
