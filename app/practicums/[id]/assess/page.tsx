import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import PracticumAssessView from "./assess-view";

export const dynamic = "force-dynamic";

interface PracticumAssessPageProps {
  params: Promise<{ id: string }>;
}

export default async function PracticumAssessPage({
  params,
}: PracticumAssessPageProps) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-wider text-red font-semibold">
          Evaluasi Laporan AI
        </span>
        <h2 className="font-serif text-2xl font-bold tracking-tight text-ink">
          Penilaian Laporan Praktikum ({practicum.slot})
        </h2>
        <p className="text-xs text-ink-soft max-w-2xl leading-relaxed">
          Koreksi berkas laporan mahasiswa dengan AI Gemini berstandar rubrik UAD. Hasil evaluasi mencakup skor rubrik, letak halaman & baris kesalahan, serta otomatis tercatat di Buku Nilai.
        </p>
      </div>

      <PracticumAssessView
        practicumId={practicum.id}
        practicumName={practicum.name}
        practicumSlot={practicum.slot}
        totalMeetings={practicum.totalMeetings}
        students={practicum.students}
        referenceTopics={topics}
      />
    </div>
  );
}
