import { prisma } from "@/lib/db";
import UploadForm from "@/app/components/upload-form";
import HistoryTable, { HistoryItem } from "@/app/components/history-table";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [referenceTopics, history] = await Promise.all([
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
      take: 20,
    }),
  ]);

  const topics = referenceTopics
    .map((r) => r.topic)
    .filter((t): t is string => Boolean(t));

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
    <div className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-6">
      <div className="mb-8 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-wider text-red">Beri Nilai</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink">
          Nilai laporan praktikum
        </h1>
        <p className="mt-2 text-ink-soft">
          Unggah satu atau beberapa laporan mahasiswa. Setiap laporan dinilai terhadap laporan
          referensi dengan topik yang sama.
        </p>
      </div>

      <UploadForm topics={topics} />

      <section className="mt-12" aria-label="Riwayat penilaian">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-ink">Riwayat Terkini</h2>
        </div>
        <HistoryTable items={formattedHistory} compact={true} />
      </section>
    </div>
  );
}
