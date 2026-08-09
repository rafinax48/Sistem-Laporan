import { z } from "zod";

/** Model Gemini yang dipakai untuk penilaian. Ganti di sini bila penamaan versi/rate limit berubah. */
export const GEMINI_MODEL_ID = "gemini-2.5-flash";

export const BAND_NAMES = ["Tidak Layak", "Lumayan", "Sangat Bagus"] as const;
export type Band = (typeof BAND_NAMES)[number];

export const CATEGORY_NAMES = [
  "Kelengkapan struktur",
  "Kebenaran isi",
  "Kedalaman analisis",
] as const;
export type CategoryName = (typeof CATEGORY_NAMES)[number];

export const CATEGORY_KEYS = [
  "kelengkapan_struktur",
  "kebenaran_isi",
  "kedalaman_analisis",
] as const;

export function getBand(score: number): Band {
  if (score >= 81) return "Sangat Bagus";
  if (score >= 50) return "Lumayan";
  return "Tidak Layak";
}

export const AssessmentCategoryInput = z.object({
  name: z.enum(CATEGORY_KEYS),
  score: z.number().int().min(0).max(100),
  comment: z.string(),
  suggestion: z.string(),
});

/** Structured output dari LLM: hanya skor + komentar + saran per kategori. Band & overall dihitung di kode. */
export const AssessmentOutput = z.object({
  categories: z.array(AssessmentCategoryInput).length(3),
});

export type AssessmentCategoryInput = z.infer<typeof AssessmentCategoryInput>;
export type AssessmentOutput = z.infer<typeof AssessmentOutput>;

export const SUPPORTED_EXTENSIONS = ["docx", "pdf", "md", "txt", "jpg", "jpeg", "png"] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const ASSESSMENT_CATEGORY_DISPLAY: Record<string, string> = {
  kelengkapan_struktur: "Kelengkapan struktur",
  kebenaran_isi: "Kebenaran isi",
  kedalaman_analisis: "Kedalaman analisis",
};
