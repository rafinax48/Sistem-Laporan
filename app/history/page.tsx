import { prisma } from "@/lib/db";
import HistoryTable, { HistoryItem } from "@/app/components/history-table";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const historyData = await prisma.assessment.findMany({
    include: {
      report: {
        select: {
          fileName: true,
          studentName: true,
          topic: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const formattedItems: HistoryItem[] = historyData.map((item) => ({
    id: item.id,
    overallScore: item.overallScore,
    createdAt: item.createdAt.toISOString(),
    report: {
      fileName: item.report.fileName,
      studentName: item.report.studentName,
      topic: item.report.topic,
      createdAt: item.report.createdAt.toISOString(),
    },
  }));

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-6">
      <div className="mb-8 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-wider text-red">Riwayat Penilaian</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink">
          Daftar Laporan yang Dinilai
        </h1>
        <p className="mt-2 text-ink-soft">
          Pantau seluruh hasil penilaian laporan praktikum lengkap dengan rincian tanggal, jam
          upload presisi, serta filter rentang waktu hari, minggu, dan bulan.
        </p>
      </div>

      <HistoryTable items={formattedItems} />
    </div>
  );
}
