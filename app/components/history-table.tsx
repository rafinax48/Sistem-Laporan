"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import BandBadge from "@/app/components/band-badge";
import { getBand } from "@/lib/types";

export interface HistoryItem {
  id: string;
  overallScore: number | null;
  createdAt: string; // ISO string
  report: {
    fileName: string;
    studentName: string | null;
    topic: string | null;
    createdAt: string; // ISO string
  };
}

interface HistoryTableProps {
  items: HistoryItem[];
  compact?: boolean;
}

type TimeRange = "all" | "today" | "week" | "month";

export default function HistoryTable({ items, compact = false }: HistoryTableProps) {
  const [range, setRange] = useState<TimeRange>("all");
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    const now = new Date().getTime();

    return items.filter((item) => {
      // 1. Filter Waktu
      const itemTime = new Date(item.report.createdAt || item.createdAt).getTime();
      const diffMs = now - itemTime;
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffHours / 24;

      if (range === "today" && diffHours > 24) return false;
      if (range === "week" && diffDays > 7) return false;
      if (range === "month" && diffDays > 30) return false;

      // 2. Filter Pencarian Teks
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchFile = item.report.fileName.toLowerCase().includes(q);
        const matchStudent = (item.report.studentName || "").toLowerCase().includes(q);
        const matchTopic = (item.report.topic || "").toLowerCase().includes(q);
        if (!matchFile && !matchStudent && !matchTopic) return false;
      }

      return true;
    });
  }, [items, range, search]);

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const dateFormatted = d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timeFormatted = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return { dateFormatted, timeFormatted };
  };

  return (
    <div className="space-y-4">
      {/* Kontrol Filter Waktu & Pencarian */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tombol Filter Rentang Waktu */}
        <div className="inline-flex rounded-lg border border-line bg-card p-1 text-xs">
          <button
            type="button"
            onClick={() => setRange("all")}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              range === "all"
                ? "bg-ink text-white"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setRange("today")}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              range === "today"
                ? "bg-ink text-white"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Hari Ini (24 Jam)
          </button>
          <button
            type="button"
            onClick={() => setRange("week")}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              range === "week"
                ? "bg-ink text-white"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Minggu Ini (7 Hari)
          </button>
          <button
            type="button"
            onClick={() => setRange("month")}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              range === "month"
                ? "bg-ink text-white"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Bulan Ini (30 Hari)
          </button>
        </div>

        {/* Input Pencarian */}
        {!compact && (
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Cari file, praktikan, topik..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-line bg-card px-3 py-1.5 text-xs text-ink placeholder:text-ink-soft focus:border-red focus:outline-none focus:ring-1 focus:ring-red"
            />
          </div>
        )}
      </div>

      {/* Indikator Jumlah Data */}
      <div className="flex items-center justify-between text-xs text-ink-soft">
        <span>
          Menampilkan <b className="font-mono text-ink">{filteredItems.length}</b> dari{" "}
          <span className="font-mono">{items.length}</span> total riwayat penilaian
        </span>
        {compact && (
          <Link
            href="/history"
            className="font-medium text-red underline-offset-2 hover:underline"
          >
            Buka Riwayat Penuh →
          </Link>
        )}
      </div>

      {/* Tabel Riwayat */}
      {filteredItems.length === 0 ? (
        <div className="rounded-lg border border-line bg-card px-5 py-12 text-center">
          <p className="font-serif text-lg font-semibold text-ink">Tidak ada riwayat</p>
          <p className="mt-1 text-sm text-ink-soft">
            {search || range !== "all"
              ? "Tidak ada laporan yang sesuai dengan filter atau rentang waktu yang dipilih."
              : "Unggah laporan mahasiswa untuk mulai menilai."}
          </p>
          {(search || range !== "all") && (
            <button
              type="button"
              onClick={() => {
                setRange("all");
                setSearch("");
              }}
              className="mt-3 inline-flex items-center rounded-md border border-line bg-hint px-3 py-1.5 text-xs font-medium text-ink hover:border-ink-soft"
            >
              Reset Filter
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-card shadow-[0_1px_2px_rgba(20,33,46,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-hint/40 text-left">
                  <th className="px-4 py-3 font-mono text-xs font-normal uppercase tracking-wider text-ink-soft">
                    File Laporan
                  </th>
                  <th className="px-4 py-3 font-mono text-xs font-normal uppercase tracking-wider text-ink-soft">
                    Praktikan
                  </th>
                  <th className="hidden px-4 py-3 font-mono text-xs font-normal uppercase tracking-wider text-ink-soft md:table-cell">
                    Topik
                  </th>
                  <th className="px-4 py-3 font-mono text-xs font-normal uppercase tracking-wider text-ink-soft">
                    Waktu Upload (Tanggal & Jam)
                  </th>
                  <th className="px-4 py-3 font-mono text-xs font-normal uppercase tracking-wider text-ink-soft">
                    Skor
                  </th>
                  <th className="px-4 py-3 font-mono text-xs font-normal uppercase tracking-wider text-ink-soft">
                    Band
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((a) => {
                  const { dateFormatted, timeFormatted } = formatDateTime(
                    a.report.createdAt || a.createdAt
                  );
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-line last:border-0 hover:bg-hint/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/assessment/${a.id}`}
                          className="font-medium text-ink underline-offset-2 hover:text-red hover:underline"
                        >
                          {a.report.fileName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {a.report.studentName ? (
                          <span className="font-medium text-ink">
                            {a.report.studentName}
                          </span>
                        ) : (
                          <span className="italic text-ink-soft/70">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-ink-soft md:table-cell">
                        {a.report.topic || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col font-mono text-xs">
                          <span className="font-medium text-ink">{dateFormatted}</span>
                          <span className="text-ink-soft">{timeFormatted} WIB</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-base font-semibold text-ink">
                        {a.overallScore ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {a.overallScore !== null ? (
                          <BandBadge band={getBand(a.overallScore)} />
                        ) : (
                          <span className="text-ink-soft">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
