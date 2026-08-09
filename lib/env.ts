import { z } from "zod";

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1).default("file:./data/app.db"),
});

export function getGeminiApiKey(): string {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = Object.keys(
      parsed.error.flatten().fieldErrors,
    ).join(", ");
    throw new Error(
      `Env tidak lengkap: ${missing}. Salin .env.example ke .env.local dan isi GEMINI_API_KEY dari AI Studio.`,
    );
  }
  return parsed.data.GEMINI_API_KEY;
}
