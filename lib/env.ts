import { z } from "zod";

const envSchema = z.object({
  NINEROUTER_API_KEY: z.string().optional(),
  NINEROUTER_BASE_URL: z.string().default("http://127.0.0.1:20128/v1"),
  NINEROUTER_MODEL_ID: z.string().default("gemini/gemini-3.5-flash-lite"),
  GEMINI_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().min(1).default("file:./data/app.db"),
});

export function getRouterConfig() {
  const env = envSchema.safeParse(process.env);
  const data = env.success ? env.data : ({} as Partial<z.infer<typeof envSchema>>);

  const apiKey =
    data.NINEROUTER_API_KEY ||
    data.GEMINI_API_KEY ||
    process.env.NINEROUTER_API_KEY ||
    process.env.GEMINI_API_KEY ||
    "sk-e318a1c54061784e-5vo9dy-c115e232";

  const baseURL =
    data.NINEROUTER_BASE_URL ||
    process.env.NINEROUTER_BASE_URL ||
    "http://127.0.0.1:20128/v1";

  const modelId =
    data.NINEROUTER_MODEL_ID ||
    process.env.NINEROUTER_MODEL_ID ||
    "gemini/gemini-3.5-flash-lite";

  return {
    apiKey,
    baseURL,
    modelId,
  };
}

export function getGeminiApiKey(): string {
  return getRouterConfig().apiKey;
}
