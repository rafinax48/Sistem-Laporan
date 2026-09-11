import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: practicumId } = await params;

    const [practicum, students, reports, referenceTopics] = await Promise.all([
      prisma.practicum.findUnique({
        where: { id: practicumId },
        select: {
          id: true,
          name: true,
          slot: true,
          totalMeetings: true,
        },
      }),
      prisma.student.findMany({
        where: { practicumId },
        orderBy: [{ className: "asc" }, { nim: "asc" }],
        select: {
          id: true,
          name: true,
          nim: true,
          className: true,
        },
      }),
      prisma.report.findMany({
        where: {
          kind: "STUDENT",
          OR: [{ practicumId }, { student: { practicumId } }],
        },
        include: {
          subjectOf: {
            select: {
              id: true,
              overallScore: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.report.findMany({
        where: { kind: "REFERENCE", topic: { not: null } },
        select: { topic: true },
        distinct: ["topic"],
        orderBy: { topic: "asc" },
      }),
    ]);

    if (!practicum) {
      return NextResponse.json(
        { error: "Praktikum tidak ditemukan." },
        { status: 404 }
      );
    }

    // Buat matriks penilaian: studentId -> meetingNumber -> Assessment info
    const matrix: Record<
      string,
      Record<
        number,
        {
          reportId: string;
          assessmentId: string | null;
          overallScore: number | null;
          fileName: string;
          topic: string | null;
          createdAt: string;
        }
      >
    > = {};

    for (const rep of reports) {
      if (!rep.studentId || rep.meetingNumber === null) continue;
      if (!matrix[rep.studentId]) {
        matrix[rep.studentId] = {};
      }

      matrix[rep.studentId][rep.meetingNumber] = {
        reportId: rep.id,
        assessmentId: rep.subjectOf?.id || null,
        overallScore: rep.subjectOf?.overallScore ?? null,
        fileName: rep.fileName,
        topic: rep.topic,
        createdAt: (rep.subjectOf?.createdAt || rep.createdAt).toISOString(),
      };
    }

    const topics = referenceTopics
      .map((r) => r.topic)
      .filter((t): t is string => Boolean(t));

    return NextResponse.json({
      practicum,
      students,
      matrix,
      topics,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memuat matriks nilai.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
