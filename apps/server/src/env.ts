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
  LLM_PROVIDER: Type.Optional(Type.Union([Type.Literal("openai"), Type.Literal("anthropic")])),
  CORS_ORIGIN: Type.Optional(Type.String()),
});

export const env = Value.Decode(envSchema, {
  PORT: process.env.PORT ?? "3000",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  LLM_PROVIDER: process.env.LLM_PROVIDER ?? "openai",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",
});
