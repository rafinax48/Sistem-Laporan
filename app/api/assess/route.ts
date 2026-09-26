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

  // Ambil API key dari header, cookie, atau form data
  const formApiKey = typeof form.get("apiKey") === "string" ? (form.get("apiKey") as string).trim() : "";
  const headerApiKey = request.headers.get("x-gemini-api-key")?.trim() || "";
  const cookieApiKey = request.cookies.get("gemini_api_key")?.value?.trim() || "";
  const customApiKey = formApiKey || headerApiKey || cookieApiKey || undefined;

  const topicInput = form.get("topic");
  const topic = typeof topicInput === "string" ? topicInput.trim() || null : null;
  const studentNameInput = form.get("studentName");
  let studentName =
    typeof studentNameInput === "string" && studentNameInput.trim()
      ? studentNameInput.trim()
      : null;

  const practicumId = typeof form.get("practicumId") === "string" ? (form.get("practicumId") as string) : null;
  const studentId = typeof form.get("studentId") === "string" ? (form.get("studentId") as string) : null;
  const meetingNumberRaw = form.get("meetingNumber");
  const meetingNumber = meetingNumberRaw ? Number(meetingNumberRaw) : null;

  // Jika studentId diberikan, ambil nama praktikan dari database jika belum diisi
  if (studentId) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (student) {
      studentName = student.name;
    }
  }

  // Jika praktikan dan pertemuan tertentu sudah pernah dinilai, bersihkan laporan lama (Perbaikan Laporan)
  if (studentId && meetingNumber !== null) {
    const existingReports = await prisma.report.findMany({
      where: {
        studentId,
        meetingNumber,
        kind: "STUDENT",
      },
      select: { id: true },
    });

    for (const oldRep of existingReports) {
      await prisma.report.delete({ where: { id: oldRep.id } });
    }
  }

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

  const reference = await findReferenceContext(topic, meetingNumber, practicumId);
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
    let createdReportId: string | null = null;
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
          rawText: parsed.rawText || parsed.text,
          practicumId: practicumId || null,
          studentId: studentId || null,
          meetingNumber: meetingNumber !== null ? meetingNumber : null,
        },
      });
      createdReportId = report.id;

      const { output, overallScore } = await assessReport(parsed, reference, customApiKey);

      const assessment = await prisma.assessment.create({
        data: {
          reportId: report.id,
          referenceReportId: reference.id,
          overallScore,
          categories: {
            create: output.categories.map((c) => ({
              name: c.name,
              score: c.score,
              comment: String(c.comment || "").slice(0, 3000),
              suggestion: String(c.suggestion || "").slice(0, 3000),
            })),
          },
          findings: {
            create: (output.findings || []).map((f) => ({
              page: typeof f.page === "number" ? f.page : null,
              section: f.section ? String(f.section).slice(0, 255) : null,
              line: typeof f.line === "number" ? f.line : null,
              quote: f.quote ? String(f.quote).slice(0, 1000) : null,
              issue: String(f.issue || "Perlu perbaikan pada bagian ini").slice(0, 2000),
              suggestion: String(f.suggestion || "Perbaiki sesuai panduan praktikum").slice(0, 2000),
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
        findings: output.findings || [],
      });
    } catch (err) {
      // Rollback: Hapus draft report yang gagal dinilai agar tidak menjadi data orphan
      if (createdReportId) {
        try {
          await prisma.report.delete({ where: { id: createdReportId } });
        } catch {
          // ignore cleanup failure
        }
      }

      const errMsg = err instanceof Error ? err.message : "Gagal menilai laporan.";
      const friendlyError =
        errMsg.includes("ECONNREFUSED") && errMsg.includes("20128")
          ? "Gateway AI lokal (9Router) belum aktif di port 20128. Jalankan `npm run router` (atau `9router`) di terminal terlebih dahulu."
          : errMsg;

      results.push({
        ok: false,
        fileName: file.name,
        error: friendlyError,
      });
    }
  }

  return NextResponse.json({ results });
}
