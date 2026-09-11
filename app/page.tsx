import { prisma } from "@/lib/db";
import HomeMatrixView from "@/app/components/home-matrix-view";
import HistoryTable, { HistoryItem } from "@/app/components/history-table";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [practicums, referenceTopics, history] = await Promise.all([
    prisma.practicum.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slot: true,
        totalMeetings: true,
      },
    }),
    prisma.report.findMany({
      where: { kind: "REFERENCE", topic: { not: null } },
      select: { topic: true },
      distinct: ["topic"],
      orderBy: { topic: "asc" },
    }),
    prisma.assessment.findMany({
      include: {
        report: { select: { fileName: true, studentName: true, topic: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const topics = referenceTopics
    .map((r) => r.topic)
    .filter((t): t is string => Boolean(t));

  const firstPracticum = practicums[0];
  let initialMatrixData = null;

  if (firstPracticum) {
    const [students, reports] = await Promise.all([
      prisma.student.findMany({
        where: { practicumId: firstPracticum.id },
        orderBy: [{ className: "asc" }, { nim: "asc" }],
        select: { id: true, name: true, nim: true, className: true },
      }),
      prisma.report.findMany({
        where: {
          kind: "STUDENT",
          OR: [
            { practicumId: firstPracticum.id },
            { student: { practicumId: firstPracticum.id } },
          ],
        },
        include: {
          subjectOf: { select: { id: true, overallScore: true, createdAt: true } },
        },
      }),
    ]);

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
      if (!matrix[rep.studentId]) matrix[rep.studentId] = {};
      matrix[rep.studentId][rep.meetingNumber] = {
        reportId: rep.id,
        assessmentId: rep.subjectOf?.id || null,
        overallScore: rep.subjectOf?.overallScore ?? null,
        fileName: rep.fileName,
        topic: rep.topic,
        createdAt: (rep.subjectOf?.createdAt || rep.createdAt).toISOString(),
      };
    }

    initialMatrixData = {
      practicum: firstPracticum,
      students,
      matrix,
      topics,
    };
  }

  const formattedHistory: HistoryItem[] = history.map((a) => ({
    id: a.id,
    overallScore: a.overallScore,
    createdAt: a.createdAt.toISOString(),
    report: {
      fileName: a.report.fileName,
      studentName: a.report.studentName,
      topic: a.report.topic,
      createdAt: a.report.createdAt.toISOString(),
    },
  }));

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 space-y-12">
      <div>
        <div className="mb-6 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-wider text-red">
            Lembar Buku Nilai
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink">
            Penilaian Laporan Praktikum
          </h1>
          <p className="mt-2 text-ink-soft text-sm">
            Tabel matriks ala Excel per mahasiswa dan per pertemuan. Klik tombol <b>+ Input Laporan</b> pada sel pertemuan untuk menilai, atau klik <b>Perbaikan</b> untuk mengunggah ulang laporan mahasiswa.
          </p>
        </div>

        {/* Matriks Nilai Ala Excel */}
        <HomeMatrixView
          practicums={practicums}
          referenceTopics={topics}
          initialMatrixData={initialMatrixData}
        />
      </div>

      {/* Riwayat Penilaian Terkini */}
      <section className="border-t border-line pt-10" aria-label="Riwayat penilaian">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold text-ink">
              Riwayat Penilaian Terkini
            </h2>
            <p className="text-xs text-ink-soft">
              Daftar evaluasi terbaru lengkap dengan jam upload dan skor band.
            </p>
          </div>
        </div>
        <HistoryTable items={formattedHistory} compact={true} />
      </section>
    </div>
  );
}
