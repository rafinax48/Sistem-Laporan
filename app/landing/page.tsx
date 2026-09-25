import { prisma } from "@/lib/db";
import LandingView from "@/app/components/landing-view";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [totalPracticums, totalStudents, totalAssessments] = await Promise.all([
    prisma.practicum.count(),
    prisma.student.count(),
    prisma.assessment.count(),
  ]);

  return (
    <LandingView
      totalPracticums={totalPracticums}
      totalStudents={totalStudents}
      totalAssessments={totalAssessments}
    />
  );
}
