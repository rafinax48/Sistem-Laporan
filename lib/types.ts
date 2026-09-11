import { z } from "zod";

/** Model default yang dipakai untuk penilaian via 9router. */
export const DEFAULT_MODEL_ID = "gemini/gemini-3.5-flash-lite";
export const GEMINI_MODEL_ID = DEFAULT_MODEL_ID;

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

export const AssessmentFinding = z.object({
  page: z.number().int().optional().nullable(),
  section: z.string().optional().nullable(),
  line: z.number().int().optional().nullable(),
  quote: z.string().optional().nullable(),
  issue: z.string(),
  suggestion: z.string(),
});

/** Structured output dari LLM: skor + komentar + saran per kategori, serta temuan detail (halaman, bagian, baris). */
export const AssessmentOutput = z.object({
  categories: z.array(AssessmentCategoryInput).length(3),
  findings: z.array(AssessmentFinding).default([]),
});

export type AssessmentCategoryInput = z.infer<typeof AssessmentCategoryInput>;
export type AssessmentFinding = z.infer<typeof AssessmentFinding>;
export type AssessmentOutput = z.infer<typeof AssessmentOutput>;


export const SUPPORTED_EXTENSIONS = ["docx", "pdf", "md", "txt", "jpg", "jpeg", "png"] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const ASSESSMENT_CATEGORY_DISPLAY: Record<string, string> = {
  kelengkapan_struktur: "Kelengkapan struktur",
  kebenaran_isi: "Kebenaran isi",
  kedalaman_analisis: "Kedalaman analisis",
};
