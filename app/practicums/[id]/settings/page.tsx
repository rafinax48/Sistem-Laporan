import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import SettingsView from "./settings-view";

export const dynamic = "force-dynamic";

interface PracticumSettingsPageProps {
  params: Promise<{ id: string }>;
}

export default async function PracticumSettingsPage({
  params,
}: PracticumSettingsPageProps) {
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
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-wider text-red font-semibold">
          Konfigurasi Praktikum
        </span>
        <h2 className="font-serif text-2xl font-bold tracking-tight text-ink">
          Pengaturan & Manajemen Praktikum
        </h2>
        <p className="text-xs text-ink-soft max-w-2xl leading-relaxed">
          Ubah informasi mata kuliah praktikum, kelola pengaturan umum, atau lakukan penghapusan praktikum beserta seluruh data nilainya secara permanen.
        </p>
      </div>

      <SettingsView practicum={practicum} />
    </div>
  );
}
