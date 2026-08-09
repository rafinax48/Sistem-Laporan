import { createGoogle } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { getGeminiApiKey } from "@/lib/env";
import {
  AssessmentOutput,
  BAND_NAMES,
  CATEGORY_KEYS,
  CATEGORY_NAMES,
  GEMINI_MODEL_ID,
} from "@/lib/types";
import type { ParseResult } from "@/lib/parse";

function model() {
  return createGoogle({ apiKey: getGeminiApiKey() })(GEMINI_MODEL_ID);
}

export const ASSESSMENT_BAND_ANCHORS: Record<
  (typeof CATEGORY_KEYS)[number],
  Record<(typeof BAND_NAMES)[number], string>
> = {
  kelengkapan_struktur: {
    "Tidak Layak":
      "Banyak bagian penting hilang (judul, pendahuluan, dasar teori, langkah, hasil, pembahasan, atau kesimpulan); urutan tidak jelas.",
    "Lumayan":
      "Struktur ada secara lengkap, tetapi sebagian bagian dangkal, tidak rapi, atau urutannya kurang runtut.",
    "Sangat Bagus":
      "Struktur lengkap, runtut, dan rapi: pendahuluan, dasar teori, langkah/algoritma, hasil, pembahasan, dan kesimpulan tersaji dengan baik.",
  },
  kebenaran_isi: {
    "Tidak Layak":
      "Banyak konsep/algoritma keliru, hasil tidak sesuai praktikum, atau isi tidak relevan dengan topik.",
    "Lumayan":
      "Isi pada umumnya benar, tetapi ada beberapa kekeliruan konsep atau hasil yang kurang akurat/detail.",
    "Sangat Bagus":
      "Konsep dan algoritma benar, hasil akurat dan konsisten dengan praktikum, istilah digunakan dengan tepat.",
  },
  kedalaman_analisis: {
    "Tidak Layak":
      "Analisis menyalin teori tanpa interpretasi hasil; tidak ada kaitan antara teori, hasil, dan kesimpulan.",
    "Lumayan":
      "Ada analisis hasil, tetapi masih di permukaan; kaitan teori–praktik belum dijelaskan secara mendalam.",
    "Sangat Bagus":
      "Analisis mendalam: interpretasi hasil, kaitan dengan teori/literatur, dan saran yang relevan dijelaskan dengan baik.",
  },
};

export function buildSystemPrompt(): string {
  const categoryLines = CATEGORY_KEYS.map((key, i) => {
    const anchors = BAND_NAMES.map(
      (band) => `- ${band} (${band === "Sangat Bagus" ? "81–100" : band === "Lumayan" ? "50–80" : "0–49"}): ${ASSESSMENT_BAND_ANCHORS[key][band]}`,
    ).join("\n");
    return `${CATEGORY_NAMES[i]} (${key}):\n${anchors}`;
  }).join("\n\n");

  return [
    "Kamu adalah asisten praktikum yang menilai laporan praktikum mahasiswa.",
    "Kamu menerima laporan mahasiswa dan laporan referensi (laporan yang dianggap sempurna untuk topik yang sama) sebagai pembanding.",
    "Berikan skor dan komentar yang adil berdasarkan kualitas laporan mahasiswa, bukan berdasarkan panjang teks.",
    "Semua komentar dan saran dalam Bahasa Indonesia, kalimat langsung, tanpa basa-basi.",
    "",
    `Skor per kategori adalah bilangan bulat 0–100. Band ditentukan oleh skor:\n- 0–49: Tidak Layak\n- 50–80: Lumayan\n- 81–100: Sangat Bagus`,
    "",
    "Rubrik per kategori:",
    categoryLines,
  ].join("\n");
}

export function buildUserPrompt(
  student: ParseResult,
  reference: { text: string; fileName: string } | null,
): string {
  const parts: string[] = [];
  parts.push("LAPORAN MAHASISWA:");

  if (student.kind === "text") {
    parts.push(student.text || "(teks kosong)");
  } else {
    parts.push(
      `(file disertakan sebagai lampiran: ${student.filename}, tipe ${student.mediaType}. Analisis isinya dari visual file.)`,
    );
  }

  if (reference) {
    parts.push("", "LAPORAN REFERENSI (pembanding untuk topik yang sama):");
    parts.push(reference.text || "(teks referensi kosong)");
  } else {
    parts.push("", "LAPORAN REFERENSI: (tidak ada, nilai berdasarkan kualitas internal)");
  }

  parts.push(
    "",
    "Keluarkan skor, komentar, dan saran untuk tepat 3 kategori: kelengkapan_struktur, kebenaran_isi, kedalaman_analisis.",
  );
  return parts.join("\n");
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Panggil Gemini dengan retry + exponential backoff untuk error rate-limit (429)
 * dan error transien (5xx). Sequential per laporan diproses di caller.
 */
async function callAssessWithRetry(
  system: string,
  prompt: string,
  parts?: { type: "file"; data: string; mediaType: string; filename?: string }[],
  maxAttempts = 4,
): Promise<AssessmentOutput> {
  const isTransient = (err: unknown): boolean => {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 429 || (status !== undefined && status >= 500)) return true;
    const message = err instanceof Error ? err.message : String(err);
    return /429|rate.?limit|RATE_LIMIT|RESOURCE_EXHAUSTED|temporar|5\d\d/.test(
      message,
    );
  };

  const base = {
    system,
    temperature: 0.2,
    maxRetries: 1,
    output: Output.object({
      schema: AssessmentOutput,
      name: "assessment",
      description: "Hasil penilaian laporan praktikum per kategori.",
    }),
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      let result: Awaited<ReturnType<typeof generateText>>;
      if (parts && parts.length > 0) {
        result = await generateText({
          ...base,
          model: model(),
          messages: [
            {
              role: "user" as const,
              content: [
                { type: "text" as const, text: prompt },
                ...parts.map((p) => ({
                  type: "file" as const,
                  data: { type: "data" as const, data: p.data },
                  mediaType: p.mediaType,
                  filename: p.filename,
                })),
              ],
            },
          ],
        });
      } else {
        result = await generateText({
          ...base,
          model: model(),
          prompt,
        });
      }

      return result.output as AssessmentOutput;
    } catch (err) {
      if (attempt === maxAttempts || !isTransient(err)) throw err;
      const backoff = 800 * 2 ** (attempt - 1) + Math.random() * 400;
      await sleep(backoff);
    }
  }

  throw new Error("Gagal menghubungi model penilaian setelah beberapa percobaan.");
}

export function computeOverallScore(
  scores: number[],
): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export type ReferenceInput = {
  text: string;
  fileName: string;
  fileData?: string;
  fileMediaType?: string;
} | null;

/**
 * Jalur penilaian utama: jalankan LLM untuk satu laporan lalu hitung band & overall.
 * `fileParts` dipakai saat laporan mahasiswa/referensi berupa scan PDF/gambar (Gemini vision).
 */
export async function assessReport(
  student: ParseResult,
  reference: ReferenceInput,
): Promise<{ output: AssessmentOutput; overallScore: number }> {
  const system = buildSystemPrompt();
  const prompt = buildUserPrompt(student, reference);

  const fileParts = [];
  if (student.kind === "file") {
    fileParts.push({
      type: "file" as const,
      data: student.data,
      mediaType: student.mediaType,
      filename: student.filename,
    });
  }
  if (reference?.fileData && reference.fileMediaType) {
    fileParts.push({
      type: "file" as const,
      data: reference.fileData,
      mediaType: reference.fileMediaType,
      filename: reference.fileName,
    });
  }

  const output = await callAssessWithRetry(system, prompt, fileParts);
  const overallScore = computeOverallScore(
    output.categories.map((c) => c.score),
  );
  return { output, overallScore };
}
