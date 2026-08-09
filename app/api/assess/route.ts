import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assessReport } from "@/lib/assess";
import { findReferenceContext } from "@/lib/reference";
import { parseReportBuffer, isSupportedFile, mediaTypeOf } from "@/lib/parse";
import { saveUpload } from "@/lib/storage";
import { getBand, MAX_UPLOAD_BYTES } from "@/lib/types";

type FileEntry = { name: string; size: number; type: string; buffer: Buffer };

async function collectFiles(form: FormData): Promise<FileEntry[]> {
  const entries = form.getAll("files").filter((v): v is File => v instanceof File);
  const results: FileEntry[] = [];
  for (const file of entries) {
    results.push({
      name: file.name,
      size: file.size,
      type: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
    });
  }
  return results;
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const topicInput = form.get("topic");
  const topic = typeof topicInput === "string" ? topicInput.trim() || null : null;
  const studentNameInput = form.get("studentName");
  const studentName =
    typeof studentNameInput === "string" && studentNameInput.trim()
      ? studentNameInput.trim()
      : null;

  let files: FileEntry[];
  try {
    files = await collectFiles(form);
  } catch {
    return NextResponse.json({ error: "Gagal membaca file upload." }, { status: 400 });
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "Minimal satu file laporan wajib diunggah." }, { status: 400 });
  }

  const tooLarge = files.find((f) => f.size > MAX_UPLOAD_BYTES);
  if (tooLarge) {
    return NextResponse.json(
      { error: `"${tooLarge.name}" melebihi batas ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.` },
      { status: 400 },
    );
  }
  const unsupported = files.find((f) => !isSupportedFile(f.name));
  if (unsupported) {
    return NextResponse.json(
      { error: `"${unsupported.name}" tidak didukung. Pakai DOCX, PDF, MD, TXT, JPG, atau PNG.` },
      { status: 400 },
    );
  }

  const reference = await findReferenceContext(topic);
  if (!reference) {
    return NextResponse.json(
      {
        error:
          "Belum ada laporan referensi untuk dipakai sebagai pembanding. " +
          (topic
            ? `Buat referensi untuk topik "${topic}" (atau satu referensi generik) di halaman Referensi dulu.`
            : "Buat referensi (spesifik per topik atau generik) di halaman Referensi dulu."),
      },
      { status: 409 },
    );
  }

  const results = [];

  // Sequential: proses satu per satu supaya tidak meledakkan rate-limit Gemini.
  for (const file of files) {
    try {
      const parsed = await parseReportBuffer(file.buffer, file.name);
      const { filePath } = await saveUpload(file.buffer, file.name);

      const report = await prisma.report.create({
        data: {
          kind: "STUDENT",
          topic,
          studentName,
          fileName: file.name,
          filePath,
          fileType: file.type || mediaTypeOf(file.name),
          rawText: parsed.kind === "text" ? parsed.text : null,
        },
      });

      const { output, overallScore } = await assessReport(parsed, reference);

      const assessment = await prisma.assessment.create({
        data: {
          reportId: report.id,
          referenceReportId: reference.id,
          overallScore,
          categories: {
            create: output.categories.map((c) => ({
              name: c.name,
              score: c.score,
              comment: c.comment,
              suggestion: c.suggestion,
            })),
          },
        },
      });

      results.push({
        ok: true,
        fileName: file.name,
        reportId: report.id,
        assessmentId: assessment.id,
        overallScore,
        overallBand: getBand(overallScore),
        categories: output.categories.map((c) => ({
          name: c.name,
          score: c.score,
          band: getBand(c.score),
          comment: c.comment,
          suggestion: c.suggestion,
        })),
      });
    } catch (err) {
      results.push({
        ok: false,
        fileName: file.name,
        error: err instanceof Error ? err.message : "Gagal menilai laporan.",
      });
    }
  }

  return NextResponse.json({ results });
}
