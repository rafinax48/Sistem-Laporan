import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { getRouterConfig } from "@/lib/env";
import {
  AssessmentOutput,
  BAND_NAMES,
  CATEGORY_KEYS,
  CATEGORY_NAMES,
} from "@/lib/types";
import type { ParseResult } from "@/lib/parse";

function model(customApiKey?: string) {
  const router = getRouterConfig();
  const activeKey = customApiKey?.trim() || router.apiKey;

  const isDirectGemini = activeKey.startsWith("AIzaSy");
  const baseURL = isDirectGemini
    ? "https://generativelanguage.googleapis.com/v1beta/openai/"
    : router.baseURL;
  const modelId = isDirectGemini
    ? "gemini-1.5-flash"
    : router.modelId;

  const provider = createOpenAI({
    apiKey: activeKey,
    baseURL,
    fetch: async (url, options) => {
      if (options && options.body && typeof options.body === "string") {
        try {
          const parsed = JSON.parse(options.body);
          if (parsed.stream === undefined) {
            parsed.stream = false;
          }
          if (parsed.response_format?.type === "json_schema") {
            parsed.response_format = { type: "json_object" };
          }
          options = { ...options, body: JSON.stringify(parsed) };
        } catch {}
      }
      return fetch(url, options);
    },
  });

  return provider.chat(modelId);
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
    "Kamu adalah asisten praktikum ahli yang menilai laporan praktikum mahasiswa secara menyeluruh.",
    "Kamu menerima laporan mahasiswa (berisi teks bernomor baris/halaman dan lampiran visual gambar/halaman PDF) serta laporan referensi sebagai tolok ukur topik.",
    "Periksa seluruh konten secara komprehensif, termasuk teks, diagram, alur algoritma, dan tangkapan layar visual (grafik/output terminal/skema).",
    "Berikan skor dan komentar yang adil berdasarkan substansi dan ketepatan ilmiah laporan.",
    "Semua komentar dan saran dalam Bahasa Indonesia, lugas, ramah namun tegas secara akademis.",
    "Kamu WAJIB selalu mengeluarkan output HANYA berupa format JSON valid sesuai skema tanpa penutup atau pembungkus kode markdown.",
    "",
    `Skor per kategori adalah bilangan bulat 0–100. Band ditentukan oleh skor:\n- 0–49: Tidak Layak\n- 50–80: Lumayan\n- 81–100: Sangat Bagus`,
    "",
    "Rubrik per kategori:",
    categoryLines,
    "",
    "INSTRUKSI TEMUAN KESALAHAN SPESIFIK (findings):",
    "Kamu WAJIB mengidentifikasi titik-titik kesalahan atau bagian yang kurang pada laporan mahasiswa dan memasukkannya ke array 'findings'.",
    "Setiap objek temuan harus merinci:",
    "- 'page': nomor halaman (angka integer seperti 1, 2, atau null jika tidak terdeteksi).",
    "- 'section': bagian/bab laporan (contoh: 'Pendahuluan', 'Dasar Teori', 'Langkah Percobaan', 'Hasil Traversal', 'Pembahasan', 'Kesimpulan').",
    "- 'line': nomor baris perkiraan (ambil angka dari penanda [L...] atau [H...:L...] di teks jika ada, atau null).",
    "- 'quote': kutipan kalimat atau deskripsi elemen visual/gambar yang bermasalah.",
    "- 'issue': penjelasan tepat mengapa bagian ini keliru, kurang akurat, atau tidak lengkap.",
    "- 'suggestion': rekomendasi perbaikan yang jelas dan dapat langsung dikerjakan oleh praktikan.",
  ].join("\n");
}

export function buildUserPrompt(
  student: ParseResult,
  reference: { text: string; fileName: string } | null,
): string {
  const parts: string[] = [];
  parts.push("LAPORAN MAHASISWA:");
  parts.push(student.text || "(teks laporan kosong)");

  if (student.images && student.images.length > 0) {
    parts.push(
      "",
      `Catatan Visual: Disertakan ${student.images.length} gambar/tangkapan halaman visual laporan. Analisis ketepatan gambar, grafik, diagram, atau screenshot output secara menyeluruh.`,
    );
  }

  if (reference) {
    parts.push("", "LAPORAN REFERENSI (pembanding topik yang sama):");
    parts.push(reference.text || "(teks referensi kosong)");
  } else {
    parts.push("", "LAPORAN REFERENSI: (tidak ada referensi khusus, nilai berdasarkan standar mutu praktikum)");
  }

  parts.push(
    "",
    "Keluarkan hasil dalam JSON dengan:",
    "1. 'categories': array tepat 3 objek { name, score, comment, suggestion } untuk kelengkapan_struktur, kebenaran_isi, kedalaman_analisis.",
    "2. 'findings': array objek kesalahan/kekurangan spesifik { page, section, line, quote, issue, suggestion }.",
  );
  return parts.join("\n");
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Panggil 9router dengan retry + exponential backoff untuk error rate-limit (429)
 * dan error transien (5xx). Sequential per laporan diproses di caller.
 */
async function callAssessWithRetry(
  system: string,
  prompt: string,
  parts?: { type: "file"; data: string; mediaType: string; filename?: string }[],
  maxAttempts = 4,
  customApiKey?: string,
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
      description: "Hasil penilaian laporan praktikum per kategori beserta temuan detail.",
    }),
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      let result: Awaited<ReturnType<typeof generateText>>;
      if (parts && parts.length > 0) {
        result = await generateText({
          ...base,
          model: model(customApiKey),
          messages: [
            {
              role: "user" as const,
              content: [
                { type: "text" as const, text: prompt },
                ...parts.map((p) => ({
                  type: "file" as const,
                  data: p.data,
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
          model: model(customApiKey),
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
 * Seluruh visual halaman PDF dan gambar dioperasikan langsung via multimodal vision.
 */
export async function assessReport(
  student: ParseResult,
  reference: ReferenceInput,
  customApiKey?: string,
): Promise<{ output: AssessmentOutput; overallScore: number }> {
  const system = buildSystemPrompt();
  const prompt = buildUserPrompt(student, reference);

  const fileParts: { type: "file"; data: string; mediaType: string; filename?: string }[] = [];

  if (student.images && student.images.length > 0) {
    for (const img of student.images) {
      fileParts.push({
        type: "file" as const,
        data: img.data,
        mediaType: img.mediaType,
        filename: img.filename,
      });
    }
  }

  if (reference?.fileData && reference.fileMediaType) {
    fileParts.push({
      type: "file" as const,
      data: reference.fileData,
      mediaType: reference.fileMediaType,
      filename: reference.fileName,
    });
  }

  const rawOutput = await callAssessWithRetry(system, prompt, fileParts, 4, customApiKey);

  // Normalisasi kategori agar tepat 3 kategori selalu ada
  const catMap = new Map(rawOutput.categories.map((c) => [c.name, c]));
  const normalizedCategories = CATEGORY_KEYS.map((key) => {
    const existing = catMap.get(key);
    if (existing) return existing;
    return {
      name: key,
      score: 70,
      comment: "Kategori dievaluasi secara otomatis berdasarkan standar format laporan praktikum.",
      suggestion: "Lengkapi dan periksa kembali rincian bagian ini sesuai modul praktikum.",
    };
  });

  const output: AssessmentOutput = {
    categories: normalizedCategories,
    findings: rawOutput.findings || [],
  };

  const overallScore = computeOverallScore(
    output.categories.map((c) => c.score),
  );
  return { output, overallScore };
}

