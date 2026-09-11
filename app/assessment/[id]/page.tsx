import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import OverrideForm from "@/app/components/override-form";
import { ASSESSMENT_CATEGORY_DISPLAY } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      report: true,
      categories: true,
      findings: { orderBy: [{ page: "asc" }, { line: "asc" }] },
      referenceReport: { select: { fileName: true, topic: true } },
    },
  });

  if (!assessment) notFound();

  const drafts = assessment.categories.map((c) => ({
    name: c.name,
    label: ASSESSMENT_CATEGORY_DISPLAY[c.name] ?? c.name,
    score: c.score,
    comment: c.comment,
    suggestion: c.suggestion,
  }));

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-6">
      <div className="mb-8 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-wider text-red">Detail Penilaian</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink">
          {assessment.report.studentName || assessment.report.fileName}
        </h1>
        <dl className="mt-3 space-y-1 font-mono text-xs text-ink-soft">
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 uppercase tracking-wider">File</dt>
            <dd className="truncate">{assessment.report.fileName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 uppercase tracking-wider">Topik</dt>
            <dd>{assessment.report.topic ?? "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 uppercase tracking-wider">Referensi</dt>
            <dd>
              {assessment.referenceReport
                ? `${assessment.referenceReport.fileName} (${assessment.referenceReport.topic ?? "generik"})`
                : "—"}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 uppercase tracking-wider">Dinilai</dt>
            <dd>
              {assessment.createdAt.toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-ink-soft">
          Skor bisa diubah manual tanpa menjalankan AI lagi —{" "}
          <span className="font-mono text-xs">Simpan Perubahan</span> menghitung ulang skor akhir.
        </p>
      </div>

      <OverrideForm
        assessmentId={assessment.id}
        initial={drafts}
        findings={assessment.findings}
      />
    </div>
  );
}

