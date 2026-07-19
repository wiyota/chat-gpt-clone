import { serve } from "@hono/node-server";
import { env } from "./env.js";
import { createApp } from "./app.js";

const app = createApp();

serve({
  fetch: app.fetch,
  port: env.PORT as number,
});

if (env.E2E || process.env.NODE_ENV === "development") {
  console.log(`Server is running on http://localhost:${env.PORT}`);
}
