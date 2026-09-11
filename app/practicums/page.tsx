import { prisma } from "@/lib/db";
import PracticumManager, { PracticumWithCount } from "@/app/components/practicum-manager";

export const dynamic = "force-dynamic";

export default async function PracticumsPage() {
  const practicumsData = await prisma.practicum.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          students: true,
          reports: true,
        },
      },
    },
  });

  const formattedPracticums: PracticumWithCount[] = practicumsData.map((p) => ({
    id: p.id,
    name: p.name,
    slot: p.slot,
    totalMeetings: p.totalMeetings,
    createdAt: p.createdAt.toISOString(),
    _count: p._count,
  }));

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-6">
      <div className="mb-8 max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-wider text-red">Mata Kuliah Praktikum</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-ink">
          Kelola Praktikum & Praktikan
        </h1>
        <p className="mt-2 text-ink-soft">
          Atur nama praktikum, slot jadwal/shift, daya tampung pertemuan, serta entri praktikan
          baik melalui form manual maupun berkas Excel, CSV, atau SVG ber-validator.
        </p>
      </div>

      <PracticumManager initialPracticums={formattedPracticums} />
    </div>
  );
}
