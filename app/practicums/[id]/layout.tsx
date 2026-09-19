import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import PracticumNav from "./practicum-nav";

export const dynamic = "force-dynamic";

interface PracticumLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function PracticumLayout({
  children,
  params,
}: PracticumLayoutProps) {
  const { id } = await params;

  const practicum = await prisma.practicum.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          students: true,
          reports: true,
        },
      },
    },
  });

  if (!practicum) {
    notFound();
  }

  return (
    <div className="min-h-[calc(100vh-140px)] bg-canvas pb-16">
      {/* Header Institusional Praktikum */}
      <div className="border-b border-line bg-card">
        <div className="mx-auto max-w-[1300px] px-4 py-6 sm:px-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-ink-soft mb-3" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink transition-colors">
              Beranda
            </Link>
            <span>/</span>
            <Link href="/practicums" className="hover:text-ink transition-colors">
              Mata Kuliah Praktikum
            </Link>
            <span>/</span>
            <span className="font-mono text-ink font-medium truncate max-w-[200px] sm:max-w-none">
              {practicum.name}
            </span>
          </nav>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-hint px-2 py-0.5 font-mono text-[11px] font-semibold text-ink">
                  {practicum.slot}
                </span>
                <span className="rounded bg-paper px-2 py-0.5 font-mono text-[11px] text-ink-soft border border-line">
                  {practicum.totalMeetings} Pertemuan Praktikum
                </span>
              </div>
              <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {practicum.name}
              </h1>
              <p className="mt-1 text-xs text-ink-soft">
                Laboratorium Teknik Informatika • Fakultas Teknologi Industri • Universitas Ahmad Dahlan
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-line bg-hint/30 px-3.5 py-2 text-left">
                <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                  Pertemuan
                </span>
                <span className="font-mono text-sm font-bold text-ink">
                  {practicum.totalMeetings} Sesi
                </span>
              </div>
              <div className="rounded-lg border border-line bg-hint/30 px-3.5 py-2 text-left">
                <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                  Praktikan
                </span>
                <span className="font-mono text-sm font-bold text-ink">
                  {practicum._count.students} Mahasiswa
                </span>
              </div>
              <div className="rounded-lg border border-line bg-hint/30 px-3.5 py-2 text-left">
                <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                  Laporan
                </span>
                <span className="font-mono text-sm font-bold text-ink">
                  {practicum._count.reports} Berkas
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <PracticumNav
        practicumId={practicum.id}
        studentCount={practicum._count.students}
        reportCount={practicum._count.reports}
      />

      {/* Konten Halaman Terpilih */}
      <main className="mx-auto max-w-[1300px] px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
