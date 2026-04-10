import { z } from "zod";

const sharedSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url()
});

const priceMicrosSchema = z.coerce.number().int().nonnegative();

export const apiEnvSchema = sharedSchema.extend({
  API_PORT: z.coerce.number().default(4000),
  API_JWT_SECRET: z.string().trim().min(24),
  TELEGRAM_BOT_TOKEN: z.string().trim().min(10),
  BOT_SHARED_SECRET: z.string().trim().min(16),
  CORS_ORIGIN: z.string().trim().default("http://localhost:3000"),
  OPENAI_API_KEY: z.string().trim().min(1).optional(),
  OPENAI_GPT_4O_MINI_TEXT_INPUT_PRICE_MICROS_PER_1M: priceMicrosSchema,
  OPENAI_GPT_4O_MINI_TEXT_OUTPUT_PRICE_MICROS_PER_1M: priceMicrosSchema,
  OPENAI_GPT_4O_TRANSCRIBE_TEXT_INPUT_PRICE_MICROS_PER_1M: priceMicrosSchema,
  OPENAI_GPT_4O_TRANSCRIBE_AUDIO_INPUT_PRICE_MICROS_PER_1M: priceMicrosSchema,
  OPENAI_GPT_4O_TRANSCRIBE_TEXT_OUTPUT_PRICE_MICROS_PER_1M: priceMicrosSchema
});

export const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().trim().url(),
  NEXT_PUBLIC_TELEGRAM_BOT_NAME: z.string().trim().min(3)
});

export const botEnvSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().trim().min(10),
  API_BASE_URL: z.string().trim().url(),
  BOT_SHARED_SECRET: z.string().trim().min(16),
  WEB_APP_URL: z.string().trim().url().default("http://localhost:3000/profile/me")
});

export function parseApiEnv(env: NodeJS.ProcessEnv) {
  return apiEnvSchema.parse(env);
}

export type AiModelPricing = {
  textInputMicrosPer1m?: bigint;
  audioInputMicrosPer1m?: bigint;
  textOutputMicrosPer1m?: bigint;
  audioOutputMicrosPer1m?: bigint;
};

export function getAiModelPricing(env: NodeJS.ProcessEnv) {
  const parsed = parseApiEnv(env);

  return {
    "gpt-4o-mini": {
      textInputMicrosPer1m: BigInt(parsed.OPENAI_GPT_4O_MINI_TEXT_INPUT_PRICE_MICROS_PER_1M),
      textOutputMicrosPer1m: BigInt(parsed.OPENAI_GPT_4O_MINI_TEXT_OUTPUT_PRICE_MICROS_PER_1M)
    },
    "gpt-4o-transcribe": {
      textInputMicrosPer1m: BigInt(parsed.OPENAI_GPT_4O_TRANSCRIBE_TEXT_INPUT_PRICE_MICROS_PER_1M),
      audioInputMicrosPer1m: BigInt(parsed.OPENAI_GPT_4O_TRANSCRIBE_AUDIO_INPUT_PRICE_MICROS_PER_1M),
      textOutputMicrosPer1m: BigInt(parsed.OPENAI_GPT_4O_TRANSCRIBE_TEXT_OUTPUT_PRICE_MICROS_PER_1M)
    }
  } satisfies Record<string, AiModelPricing>;
}

export function parseWebEnv(env: NodeJS.ProcessEnv) {
  return webEnvSchema.parse(env);
}

export function parseBotEnv(env: NodeJS.ProcessEnv) {
  return botEnvSchema.parse(env);
}
