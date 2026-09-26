import { prisma } from "@/lib/db";
import { getBasisDataModule, getBasisDataModuleByTopic } from "@/lib/curriculum/basis-data";

export type ReferenceContext = {
  id: string;
  text: string;
  fileName: string;
  fileData?: string;
  fileMediaType?: string;
} | null;

/**
 * Cari laporan referensi untuk dipakai sebagai pembanding.
 * Prioritas:
 * 1. Referensi spesifik per praktikum & pertemuan (meetingNumber + practicumId).
 * 2. Referensi pertemuan (meetingNumber).
 * 3. Referensi dengan nama topik sama.
 * 4. Modul Kurikulum Resmi Basis Data 2026 (fallback instan dari buku modul).
 * 5. Referensi generik (topic=null).
 */
export async function findReferenceContext(
  topic?: string | null,
  meetingNumber?: number | null,
  practicumId?: string | null,
): Promise<ReferenceContext> {
  let ref: {
    id: string;
    rawText: string | null;
    fileName: string;
    filePath: string;
  } | null = null;

  // 1. Cek referensi spesifik meetingNumber + practicumId
  if (meetingNumber && practicumId) {
    ref = await prisma.report.findFirst({
      where: { kind: "REFERENCE", meetingNumber, practicumId },
      select: { id: true, rawText: true, fileName: true, filePath: true },
      orderBy: { createdAt: "desc" },
    });
  }

  // 2. Cek referensi meetingNumber global
  if (!ref && meetingNumber) {
    ref = await prisma.report.findFirst({
      where: { kind: "REFERENCE", meetingNumber },
      select: { id: true, rawText: true, fileName: true, filePath: true },
      orderBy: { createdAt: "desc" },
    });
  }

  // 3. Cek referensi berdasarkan nama topik
  if (!ref && topic && topic.trim()) {
    ref = await prisma.report.findFirst({
      where: { kind: "REFERENCE", topic: topic.trim() },
      select: { id: true, rawText: true, fileName: true, filePath: true },
      orderBy: { createdAt: "desc" },
    });
  }

  // 4. Fallback ke Modul Resmi Kurikulum Basis Data 2026
  if (!ref && meetingNumber) {
    const curModule = getBasisDataModule(meetingNumber);
    if (curModule) {
      return {
        id: `curriculum-p${meetingNumber}`,
        text: curModule.referenceMarkdown,
        fileName: `Modul_Resmi_P${meetingNumber}_${curModule.topic.replace(/[^a-zA-Z0-9]/g, "_")}.md`,
      };
    }
  }

  if (!ref && topic) {
    const curModule = getBasisDataModuleByTopic(topic);
    if (curModule) {
      return {
        id: `curriculum-p${curModule.meetingNumber}`,
        text: curModule.referenceMarkdown,
        fileName: `Modul_Resmi_P${curModule.meetingNumber}_${curModule.topic.replace(/[^a-zA-Z0-9]/g, "_")}.md`,
      };
    }
  }

  // 5. Cek referensi generik (topic = null)
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

