import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import StudentManager, { StudentItem } from "@/app/components/student-manager";

export const dynamic = "force-dynamic";

interface PracticumStudentsPageProps {
  params: Promise<{ id: string }>;
}

export default async function PracticumStudentsPage({
  params,
}: PracticumStudentsPageProps) {
  const { id } = await params;

  const practicum = await prisma.practicum.findUnique({
    where: { id },
    include: {
      students: {
        orderBy: [{ className: "asc" }, { nim: "asc" }],
      },
    },
  });

  if (!practicum) {
    notFound();
  }

  const initialStudents: StudentItem[] = practicum.students.map((st) => ({
    id: st.id,
    name: st.name,
    nim: st.nim,
    className: st.className,
    createdAt: st.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-wider text-red font-semibold">
          Data Mahasiswa Praktikan
        </span>
        <h2 className="font-serif text-2xl font-bold tracking-tight text-ink">
          Kelola Peserta Praktikum ({practicum.slot})
        </h2>
        <p className="text-xs text-ink-soft max-w-2xl leading-relaxed">
          Tambahkan mahasiswa secara manual, impor massal via file Excel/CSV/SVG dengan deteksi kolom cerdas, perbaiki data mahasiswa, atau hapus data jika diperlukan.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(20,33,46,0.04)]">
        <StudentManager
          practicumId={practicum.id}
          practicumName={`${practicum.name} — ${practicum.slot}`}
          initialStudents={initialStudents}
        />
      </div>
    </div>
  );
}
