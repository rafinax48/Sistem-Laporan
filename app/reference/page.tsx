import { prisma } from "@/lib/db";
import ReferencePanel from "@/app/components/reference-panel";

export const dynamic = "force-dynamic";

export default async function ReferencePage() {
  const rows = await prisma.report.findMany({
    where: { kind: "REFERENCE" },
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

  const references = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-6">
      <div className="mb-8 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-wider text-red">Referensi</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink">
          Kelola laporan referensi
        </h1>
        <p className="mt-2 text-ink-soft">
          Referensi adalah &ldquo;laporan sempurna&rdquo; per topik yang dipakai sebagai pembanding
          saat menilai. Buat sekali per topik; tanpa referensi, penilaian akan diblok.
        </p>
      </div>

      <ReferencePanel references={references} />
    </div>
  );
}
