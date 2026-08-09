import Link from "next/link";
import { prisma } from "@/lib/db";
import UploadForm from "@/app/components/upload-form";
import BandBadge from "@/app/components/band-badge";
import { getBand } from "@/lib/types";

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
        <h2 className="mb-4 font-serif text-xl font-semibold text-ink">Riwayat</h2>
        {history.length === 0 ? (
          <div className="rounded-lg border border-line bg-card px-5 py-10 text-center">
            <p className="font-serif text-lg font-semibold text-ink">Belum ada penilaian</p>
            <p className="mt-1 text-sm text-ink-soft">
              Unggah laporan mahasiswa di atas untuk mulai menilai.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-4 py-3 font-mono text-xs font-normal uppercase tracking-wider text-ink-soft">
                    File
                  </th>
                  <th className="hidden px-4 py-3 font-mono text-xs font-normal uppercase tracking-wider text-ink-soft sm:table-cell">
                    Praktikan
                  </th>
                  <th className="hidden px-4 py-3 font-mono text-xs font-normal uppercase tracking-wider text-ink-soft md:table-cell">
                    Topik
                  </th>
                  <th className="px-4 py-3 font-mono text-xs font-normal uppercase tracking-wider text-ink-soft">
                    Skor
                  </th>
                  <th className="hidden px-4 py-3 font-mono text-xs font-normal uppercase tracking-wider text-ink-soft lg:table-cell">
                    Band
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((a) => (
                  <tr key={a.id} className="border-b border-line last:border-0 hover:bg-hint">
                    <td className="px-4 py-3">
                      <Link
                        href={`/assessment/${a.id}`}
                        className="font-medium text-ink underline-offset-2 hover:underline"
                      >
                        {a.report.fileName}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-ink-soft sm:table-cell">
                      {a.report.studentName || "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-ink-soft md:table-cell">
                      {a.report.topic || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-base font-semibold text-ink">
                      {a.overallScore ?? "—"}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {a.overallScore !== null ? (
                        <BandBadge band={getBand(a.overallScore)} />
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
