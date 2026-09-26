import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import AssessmentMatrix from "@/app/components/assessment-matrix";

export const dynamic = "force-dynamic";

interface PracticumGradebookPageProps {
  params: Promise<{ id: string }>;
}

export default async function PracticumGradebookPage({
  params,
}: PracticumGradebookPageProps) {
  const { id } = await params;

  const [practicum, referenceReports] = await Promise.all([
    prisma.practicum.findUnique({
      where: { id },
      include: {
        students: {
          orderBy: [{ className: "asc" }, { nim: "asc" }],
          select: {
            id: true,
            name: true,
            nim: true,
            className: true,
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
    notFound();
  }

  const topics = referenceReports
    .map((r) => r.topic)
    .filter((t): t is string => Boolean(t));

  // Ambil seluruh laporan mahasiswa pada praktikum ini
  const reports = await prisma.report.findMany({
    where: {
      kind: "STUDENT",
      OR: [
        { practicumId: id },
        { student: { practicumId: id } },
      ],
    },
    orderBy: [{ createdAt: "desc" }],
    include: {
      subjectOf: {
        select: {
          id: true,
          overallScore: true,
          createdAt: true,
        },
      },
    },
  });

  // Konstruksi matriks: [studentId][meetingNumber]
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

    const existingCell = matrix[rep.studentId][rep.meetingNumber];
    if (existingCell) {
      if (existingCell.overallScore !== null) {
        continue;
      }
      if (rep.subjectOf?.overallScore === null) {
        continue;
      }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-red font-semibold">
            Buku Nilai Resmi
          </span>
          <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-ink">
            Matriks Penilaian Laporan Pertemuan
          </h2>
          <p className="mt-1 text-xs text-ink-soft max-w-2xl">
            Tabel rekapitulasi nilai praktikan pertemuan P01 hingga P{practicum.totalMeetings}.
            Klik pada setiap sel untuk menilai, melihat rincian evaluasi AI, atau mengunggah revisi laporan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/practicums/${practicum.id}/curriculum`}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card px-3.5 py-2 font-mono text-xs font-semibold text-ink hover:border-ink-soft transition-colors"
          >
            <span>📖 Silabus & Modul (12)</span>
          </Link>
          <Link
            href={`/practicums/${practicum.id}/students`}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card px-3.5 py-2 font-mono text-xs font-semibold text-ink hover:border-ink-soft transition-colors"
          >
            <span>Kelola Praktikan ({practicum.students.length})</span>
          </Link>
          <Link
            href={`/practicums/${practicum.id}/assess`}
            className="inline-flex items-center gap-1.5 rounded-md bg-red px-3.5 py-2 font-mono text-xs font-semibold text-white shadow-sm hover:bg-red-deep transition-colors"
          >
            <span>+ Nilai Laporan Baru</span>
          </Link>
        </div>
      </div>

      {practicum.students.length === 0 ? (
        <div className="rounded-xl border border-line bg-card p-10 text-center space-y-3">
          <div className="text-3xl">👥</div>
          <h3 className="font-serif text-lg font-semibold text-ink">
            Belum Ada Data Praktikan
          </h3>
          <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
            Praktikum ini belum memiliki daftar mahasiswa praktikan. Silakan tambahkan mahasiswa secara manual atau impor dari berkas Excel/CSV terlebih dahulu.
          </p>
          <div className="pt-2">
            <Link
              href={`/practicums/${practicum.id}/students`}
              className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 font-mono text-xs uppercase tracking-wider text-white hover:bg-red transition-colors"
            >
              + Buka Halaman Kelola Praktikan
            </Link>
          </div>
        </div>
      ) : (
        <AssessmentMatrix
          practicumId={practicum.id}
          practicumName={practicum.name}
          practicumSlot={practicum.slot}
          totalMeetings={practicum.totalMeetings}
          students={practicum.students}
          initialMatrix={matrix}
          referenceTopics={topics}
        />
      )}
    </div>
  );
}
