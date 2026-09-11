import { prisma } from "@/lib/db";

export type ReferenceContext = {
  id: string;
  text: string;
  fileName: string;
  fileData?: string;
  fileMediaType?: string;
} | null;

/**
 * Cari laporan referensi untuk dipakai sebagai pembanding.
 * Prioritas: referensi spesifik dengan topic sama → referensi generik (topic=null).
 * Tidak ada yang cocok → kembalikan null (assess diblok).
 */
export async function findReferenceContext(
  topic?: string | null,
): Promise<ReferenceContext> {
  let ref: {
    id: string;
    rawText: string | null;
    fileName: string;
    filePath: string;
  } | null = null;

  if (topic && topic.trim()) {
    ref = await prisma.report.findFirst({
      where: { kind: "REFERENCE", topic: topic.trim() },
      select: { id: true, rawText: true, fileName: true, filePath: true },
      orderBy: { createdAt: "desc" },
    });
  }
  if (!ref) {
    ref = await prisma.report.findFirst({
      where: { kind: "REFERENCE", topic: null },
      select: { id: true, rawText: true, fileName: true, filePath: true },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!ref) return null;

  if (ref.rawText && ref.rawText.trim()) {
    return { id: ref.id, text: ref.rawText, fileName: ref.fileName };
  }

  // Referensi berupa scan/gambar: sertakan file part agar Gemini vision membacanya.
  const { readFile } = await import("node:fs/promises");
  try {
    const buffer = await readFile(ref.filePath);
    const { parseReportBuffer } = await import("@/lib/parse");
    const parsed = await parseReportBuffer(buffer, ref.fileName);
    if (parsed.images && parsed.images.length > 0) {
      return {
        id: ref.id,
        text: parsed.text || "(referensi berupa file visual — disertakan sebagai lampiran)",
        fileName: ref.fileName,
        fileData: parsed.images[0].data,
        fileMediaType: parsed.images[0].mediaType,
      };
    }
    return {
      id: ref.id,
      text: parsed.text || "(referensi kosong)",
      fileName: ref.fileName,
    };
  } catch {
    return null;
  }
}

