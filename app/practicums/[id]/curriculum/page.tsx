import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { BASIS_DATA_CURRICULUM } from "@/lib/curriculum/basis-data";
import CurriculumViewer from "./curriculum-viewer";

export const dynamic = "force-dynamic";

interface PracticumCurriculumPageProps {
  params: Promise<{ id: string }>;
}

export default async function PracticumCurriculumPage({
  params,
}: PracticumCurriculumPageProps) {
  const { id } = await params;

  const practicum = await prisma.practicum.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slot: true,
      totalMeetings: true,
    },
  });

  if (!practicum) {
    notFound();
  }

  // Gunakan kurikulum resmi Basis Data 2026
  const modules = BASIS_DATA_CURRICULUM;

  return (
    <div className="py-2">
      <CurriculumViewer
        practicumId={practicum.id}
        practicumName={practicum.name}
        modules={modules}
      />
    </div>
  );
}
