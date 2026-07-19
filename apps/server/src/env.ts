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

function boundedInteger(defaultValue: number, minimum: number, maximum: number) {
  return Type.Transform(Type.Optional(Type.String({ pattern: "^[0-9]+$" })))
    .Decode((value) => {
      const parsed = Number(value ?? String(defaultValue));
      if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
        throw new Error(`Expected an integer between ${minimum} and ${maximum}`);
      }
      return parsed;
    })
    .Encode((value) => String(value));
}

const envSchema = Type.Object({
  PORT: boundedInteger(3000, 1, 65535),
  SUPABASE_URL: Type.String({ format: "uri" }),
  SUPABASE_SECRET_KEY: Type.String({ minLength: 1 }),
  SUPABASE_PUBLISHABLE_KEY: Type.String({ minLength: 1 }),
  OPENAI_API_KEY: Type.String({ minLength: 1 }),
  OPENAI_MODEL: Type.Optional(Type.String()),
  MAX_COMPLETION_TOKENS: boundedInteger(2048, 1, 128000),
  LLM_PROVIDER: Type.Optional(Type.Union([Type.Literal("openai"), Type.Literal("anthropic")])),
  CORS_ORIGIN: Type.Optional(Type.String({ format: "uri" })),
  CONTEXT_WINDOW_TOKENS: boundedInteger(4000, 1, 1_000_000),
  RECENT_MESSAGES_TO_KEEP: boundedInteger(6, 0, 50),
  DAILY_TOKEN_BUDGET: boundedInteger(10000, 1, 10_000_000),
  MEMORY_MAX_FACTS: boundedInteger(10, 0, 1000),
  E2E: Type.Transform(Type.Optional(Type.String()))
    .Decode((value) => value === "true")
    .Encode((value) => String(value)),
});

export const env = Value.Decode(envSchema, {
  PORT: process.env.PORT ?? "3000",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  MAX_COMPLETION_TOKENS: process.env.MAX_COMPLETION_TOKENS ?? "2048",
  LLM_PROVIDER: process.env.LLM_PROVIDER ?? "openai",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  CONTEXT_WINDOW_TOKENS: process.env.CONTEXT_WINDOW_TOKENS ?? "4000",
  RECENT_MESSAGES_TO_KEEP: process.env.RECENT_MESSAGES_TO_KEEP ?? "6",
  DAILY_TOKEN_BUDGET: process.env.DAILY_TOKEN_BUDGET ?? "10000",
  MEMORY_MAX_FACTS: process.env.MEMORY_MAX_FACTS ?? "10",
  E2E: process.env.E2E ?? "false",
});

export function assertProductionSecurity(): void {
  const isDevelopment = process.env.NODE_ENV === "development";
  const isE2E = env.E2E;

  const unsafeFlags = [
    !isDevelopment && isE2E && "E2E",
    !isDevelopment && !isE2E && process.env.SKIP_BUDGET === "true" && "SKIP_BUDGET",
    !isDevelopment && !isE2E && process.env.LOG_LLM_STREAM === "true" && "LOG_LLM_STREAM",
  ].filter(Boolean);

  if (unsafeFlags.length > 0) {
    throw new Error(`Unsafe production flags enabled: ${unsafeFlags.join(", ")}`);
  }
}
