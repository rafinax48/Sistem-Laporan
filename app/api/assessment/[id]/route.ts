import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeOverallScore } from "@/lib/assess";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      report: true,
      categories: { orderBy: { name: "asc" } },
      referenceReport: { select: { id: true, topic: true, fileName: true } },
    },
  });
  if (!assessment) {
    return NextResponse.json({ error: "Penilaian tidak ditemukan." }, { status: 404 });
  }
  return NextResponse.json({ assessment });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const existing = await prisma.assessment.findUnique({
    where: { id },
    include: { categories: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Penilaian tidak ditemukan." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const inputCategories = body?.categories;
  if (!Array.isArray(inputCategories) || inputCategories.length === 0) {
    return NextResponse.json(
      { error: "Body harus berisi categories (skor 0–100 + komentar + saran)." },
      { status: 400 },
    );
  }

  const names = existing.categories.map((c) => c.name);
  for (const cat of inputCategories) {
    if (!names.includes(cat.name)) {
      return NextResponse.json(
        { error: `Kategori "${cat.name}" tidak dikenal.` },
        { status: 400 },
      );
    }
    const score = Number(cat.score);
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      return NextResponse.json(
        { error: `Skor untuk "${cat.name}" harus bilangan bulat 0–100.` },
        { status: 400 },
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const cat of inputCategories) {
      await tx.assessmentCategory.updateMany({
        where: { assessmentId: id, name: cat.name },
        data: {
          score: Number(cat.score),
          comment: String(cat.comment ?? ""),
          suggestion: String(cat.suggestion ?? ""),
        },
      });
    }

    const fresh = await tx.assessmentCategory.findMany({
      where: { assessmentId: id },
    });
    const overallScore = computeOverallScore(fresh.map((c) => c.score));

    const assessment = await tx.assessment.update({
      where: { id },
      data: { overallScore },
      include: {
        report: true,
        categories: { orderBy: { name: "asc" } },
        referenceReport: { select: { id: true, topic: true, fileName: true } },
      },
    });
    return assessment;
  });

  return NextResponse.json({ assessment: updated });
}
