import { Type, FormatRegistry } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import "dotenv/config";

FormatRegistry.Set("uri", (value) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
});

const envSchema = Type.Object({
  PORT: Type.Transform(Type.Optional(Type.String()))
    .Decode((value) => Number(value ?? "3000"))
    .Encode((value) => String(value)),
  SUPABASE_URL: Type.String({ format: "uri" }),
  SUPABASE_SECRET_KEY: Type.String({ minLength: 1 }),
  OPENAI_API_KEY: Type.String({ minLength: 1 }),
  OPENAI_MODEL: Type.Optional(Type.String()),
  LLM_PROVIDER: Type.Optional(Type.Union([Type.Literal("openai"), Type.Literal("anthropic")])),
  CORS_ORIGIN: Type.Optional(Type.String({ format: "uri" })),
  CONTEXT_WINDOW_TOKENS: Type.Transform(Type.Optional(Type.String()))
    .Decode((value) => Number(value ?? "4000"))
    .Encode((value) => String(value)),
  RECENT_MESSAGES_TO_KEEP: Type.Transform(Type.Optional(Type.String()))
    .Decode((value) => Number(value ?? "6"))
    .Encode((value) => String(value)),
  DAILY_TOKEN_BUDGET: Type.Transform(Type.Optional(Type.String()))
    .Decode((value) => Number(value ?? "10000"))
    .Encode((value) => String(value)),
  MEMORY_MAX_FACTS: Type.Transform(Type.Optional(Type.String()))
    .Decode((value) => Number(value ?? "10"))
    .Encode((value) => String(value)),
  E2E: Type.Transform(Type.Optional(Type.String()))
    .Decode((value) => value === "true")
    .Encode((value) => String(value)),
});

export const env = Value.Decode(envSchema, {
  PORT: process.env.PORT ?? "3000",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  LLM_PROVIDER: process.env.LLM_PROVIDER ?? "openai",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  CONTEXT_WINDOW_TOKENS: process.env.CONTEXT_WINDOW_TOKENS ?? "4000",
  RECENT_MESSAGES_TO_KEEP: process.env.RECENT_MESSAGES_TO_KEEP ?? "6",
  DAILY_TOKEN_BUDGET: process.env.DAILY_TOKEN_BUDGET ?? "10000",
  MEMORY_MAX_FACTS: process.env.MEMORY_MAX_FACTS ?? "10",
  E2E: process.env.E2E ?? "false",
});
