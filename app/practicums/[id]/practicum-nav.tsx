"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface PracticumNavProps {
  practicumId: string;
  studentCount: number;
  reportCount: number;
}

export default function PracticumNav({
  practicumId,
  studentCount,
  reportCount,
}: PracticumNavProps) {
  const pathname = usePathname();
  const baseUrl = `/practicums/${practicumId}`;

  const navItems = [
    {
      href: baseUrl,
      label: "Buku Nilai",
      subLabel: "Matriks Pertemuan",
      icon: "📊",
      exact: true,
      badge: null,
    },
    {
      href: `${baseUrl}/students`,
      label: "Data Praktikan",
      subLabel: "Daftar & Impor",
      icon: "👥",
      exact: false,
      badge: `${studentCount} Mhs`,
    },
    {
      href: `${baseUrl}/assess`,
      label: "Penilaian Laporan",
      subLabel: "Evaluasi AI",
      icon: "📝",
      exact: false,
      badge: `${reportCount} Laporan`,
    },
    {
      href: `${baseUrl}/settings`,
      label: "Pengaturan & Hapus",
      subLabel: "Konfigurasi",
      icon: "⚙️",
      exact: false,
      badge: null,
    },
  ];

  return (
    <nav className="border-b border-line bg-card/60 backdrop-blur-sm sticky top-[73px] z-30">
      <div className="mx-auto flex max-w-[1300px] items-center gap-1 overflow-x-auto px-4 sm:px-6">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-2.5 border-b-2 py-3 px-3 sm:px-4 text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "border-red text-red font-semibold bg-red/5"
                  : "border-transparent text-ink-soft hover:border-line hover:text-ink hover:bg-hint/50"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <div className="flex flex-col text-left">
                <span className="leading-tight">{item.label}</span>
                <span className="text-[10px] font-mono text-ink-soft/70 font-normal hidden sm:inline">
                  {item.subLabel}
                </span>
              </div>
              {item.badge && (
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 font-mono text-[10px] ${
                    isActive
                      ? "bg-red text-white"
                      : "bg-hint text-ink group-hover:bg-line"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
