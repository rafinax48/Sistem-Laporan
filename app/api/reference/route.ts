import { NextRequest, NextResponse } from "next/server";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { parseReportBuffer } from "@/lib/parse";
import { saveUpload } from "@/lib/storage";
import { MAX_UPLOAD_BYTES } from "@/lib/types";

export async function GET(request: NextRequest) {
  const topic = request.nextUrl.searchParams.get("topic");
  const where = topic ? { kind: "REFERENCE" as const, topic } : { kind: "REFERENCE" as const };
  const references = await prisma.report.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      topic: true,
      fileName: true,
      fileType: true,
      createdAt: true,
      rawText: true,
    },
  });
  return NextResponse.json({ references });
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  const topicInput = form.get("topic");
  const topic = typeof topicInput === "string" && topicInput.trim() ? topicInput.trim() : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File wajib disertakan." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File terlalu besar (maks ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).` },
      { status: 400 },
    );
  }

  let rawText: string | null = null;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseReportBuffer(buffer, file.name);
    rawText = parsed.rawText || parsed.text;


    const { filePath } = await saveUpload(buffer, file.name);
    const report = await prisma.report.create({
      data: {
        kind: "REFERENCE",
        topic,
        fileName: file.name,
        filePath,
        fileType: file.type,
        rawText,
      },
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan referensi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Parameter id wajib." }, { status: 400 });
  }

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report || report.kind !== "REFERENCE") {
    return NextResponse.json({ error: "Referensi tidak ditemukan." }, { status: 404 });
  }

  const used = await prisma.assessment.findFirst({
    where: { referenceReportId: id },
    select: { id: true },
  });
  if (used) {
    return NextResponse.json(
      { error: "Referensi masih dipakai oleh penilaian. Hapus penilaian terkait dulu." },
      { status: 409 },
    );
  }

  await prisma.report.delete({ where: { id } });
  const fullPath = path.resolve(report.filePath);
  try {
    await readFile(fullPath);
    await unlink(fullPath);
  } catch {
    // file sudah tidak ada — abaikan
  }
  return NextResponse.json({ ok: true });
}
