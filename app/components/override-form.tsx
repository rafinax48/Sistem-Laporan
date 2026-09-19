"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BandBadge from "@/app/components/band-badge";
import { getBand, Band } from "@/lib/types";

export type CategoryDraft = {
  name: string;
  label: string;
  score: number;
  comment: string;
  suggestion: string;
};

export type FindingItem = {
  id?: string;
  page?: number | null;
  section?: string | null;
  line?: number | null;
  quote?: string | null;
  issue: string;
  suggestion: string;
};

export default function OverrideForm({
  assessmentId,
  initial,
  findings = [],
}: {
  assessmentId: string;
  initial: CategoryDraft[];
  findings?: FindingItem[];
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryDraft[]>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter temuan kesalahan
  const [findingSearch, setFindingSearch] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("all");

  const overall = Math.round(
    categories.reduce((sum, c) => sum + c.score, 0) / Math.max(categories.length, 1)
  );
  const overallBand = getBand(overall);

  function update(index: number, patch: Partial<CategoryDraft>) {
    setCategories((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  // Daftar section/bab unik dari temuan
  const uniqueSections = useMemo(() => {
    const set = new Set<string>();
    for (const f of findings) {
      if (f.section) set.add(f.section.trim());
    }
    return Array.from(set).sort();
  }, [findings]);

  // Filter temuan
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (selectedSection !== "all" && f.section?.trim() !== selectedSection) {
        return false;
      }
      if (!findingSearch.trim()) return true;
      const q = findingSearch.toLowerCase();
      return (
        (f.section || "").toLowerCase().includes(q) ||
        (f.quote || "").toLowerCase().includes(q) ||
        f.issue.toLowerCase().includes(q) ||
        f.suggestion.toLowerCase().includes(q)
      );
    });
  }, [findings, findingSearch, selectedSection]);

  async function onSave() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/assessment/${assessmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: categories.map((c) => ({
            name: c.name,
            score: c.score,
            comment: c.comment,
            suggestion: c.suggestion,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan perubahan.");
        return;
      }
      setMessage("Perubahan nilai berhasil disimpan dan skor akhir telah diperbarui.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Kartu Skor Akhir Teragregasi */}
      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-line bg-card px-6 py-5 shadow-[0_1px_3px_rgba(11,19,43,0.04)]">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-5xl font-extrabold leading-none text-ink">
            {overall}
          </span>
          <span className="font-mono text-sm text-ink-soft">/ 100</span>
        </div>
        <div className="flex flex-col gap-1">
          <BandBadge band={overallBand as Band} />
          <span className="text-xs text-ink-soft">Predikat Kinerja Akademik</span>
        </div>
        <div className="ml-auto max-w-xs text-right text-xs text-ink-soft leading-relaxed hidden sm:block">
          Skor akhir dihitung otomatis dari rata-rata pembobotan 3 kategori rubrik praktikum.
        </div>
      </div>

      {/* Rincian 3 Rubrik Penilaian */}
      <div>
        <div className="mb-3">
          <h2 className="font-serif text-xl font-bold text-ink">Rubrik Penilaian Utama</h2>
          <p className="text-xs text-ink-soft">
            Ubah skor manual, catatan evaluasi, atau saran perbaikan tanpa perlu menjalankan AI ulang.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {categories.map((c, i) => (
            <div
              key={c.name}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(11,19,43,0.03)]"
            >
              <div className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
                <h3 className="font-serif text-base font-bold text-ink">{c.label}</h3>
                <BandBadge band={getBand(c.score) as Band} />
              </div>

              <label className="space-y-1">
                <span className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft font-semibold">
                  Skor (0–100)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={c.score}
                  onChange={(e) => update(i, { score: Number(e.target.value) })}
                  className="w-full rounded-lg border border-line bg-paper px-3 py-2 font-mono text-base font-bold text-ink focus:border-uad-gold focus:outline-none"
                />
              </label>

              <label className="space-y-1">
                <span className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft font-semibold">
                  Catatan Evaluasi
                </span>
                <textarea
                  rows={4}
                  value={c.comment}
                  onChange={(e) => update(i, { comment: e.target.value })}
                  className="w-full resize-y rounded-lg border border-line bg-paper px-3 py-2 text-xs leading-relaxed text-ink focus:border-uad-gold focus:outline-none"
                />
              </label>

              <label className="space-y-1">
                <span className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft font-semibold">
                  Saran Perbaikan
                </span>
                <textarea
                  rows={4}
                  value={c.suggestion}
                  onChange={(e) => update(i, { suggestion: e.target.value })}
                  className="w-full resize-y rounded-lg border border-line bg-paper px-3 py-2 text-xs leading-relaxed text-ink focus:border-uad-gold focus:outline-none"
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Rincian Temuan Kesalahan & Bukti Dokumen */}
      {findings && findings.length > 0 && (
        <section className="space-y-4" aria-label="Temuan Kesalahan Detail">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl font-bold text-ink">
                  Detail Temuan &amp; Kesalahan
                </h2>
                <span className="rounded-full bg-[#FEF2F2] border border-[#FECACA] px-2.5 py-0.5 font-mono text-xs font-bold text-red">
                  {findings.length} Titik Masalah
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                Pelacakan lokasi halaman, bab/bagian, dan perkiraan baris laporan yang perlu diperbaiki.
              </p>
            </div>

            {/* Filter Section & Pencarian */}
            <div className="flex flex-wrap items-center gap-2">
              {uniqueSections.length > 0 && (
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="rounded-lg border border-line bg-paper px-3 py-1.5 font-mono text-xs text-ink focus:border-uad-gold focus:outline-none"
                >
                  <option value="all">Semua Bagian ({findings.length})</option>
                  {uniqueSections.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                </select>
              )}

              <input
                type="text"
                placeholder="Cari temuan kesalahan..."
                value={findingSearch}
                onChange={(e) => setFindingSearch(e.target.value)}
                className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs text-ink placeholder:text-ink-soft focus:border-uad-gold focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-3">
            {filteredFindings.length === 0 ? (
              <div className="rounded-xl border border-line bg-card p-6 text-center text-xs font-mono text-ink-soft">
                Tidak ada temuan yang cocok dengan filter.
              </div>
            ) : (
              filteredFindings.map((f, idx) => (
                <div
                  key={f.id || idx}
                  className="rounded-xl border border-line bg-card p-4 space-y-3 transition-colors hover:border-ink-soft shadow-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-ink px-2.5 py-0.5 font-mono text-xs font-bold text-white">
                      #{idx + 1}
                    </span>
                    {f.page !== null && f.page !== undefined && (
                      <span className="rounded-md border border-line bg-hint px-2.5 py-0.5 font-mono text-xs font-semibold text-ink">
                        Hal. {f.page}
                      </span>
                    )}
                    {f.line !== null && f.line !== undefined && (
                      <span className="rounded-md border border-line bg-hint px-2.5 py-0.5 font-mono text-xs text-ink">
                        Baris {f.line}
                      </span>
                    )}
                    {f.section && (
                      <span className="rounded-md border border-[#FEF3C7] bg-[#FFFBEB] px-2.5 py-0.5 font-mono text-xs font-bold text-[#92400E]">
                        Bagian: {f.section}
                      </span>
                    )}
                  </div>

                  {f.quote && (
                    <blockquote className="rounded-lg border-l-3 border-red bg-hint/50 px-3.5 py-2 font-mono text-xs text-ink italic leading-relaxed">
                      &ldquo;{f.quote}&rdquo;
                    </blockquote>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2 text-xs pt-1">
                    <div className="rounded-lg border border-red/20 bg-[#FEF2F2]/60 p-3 space-y-1">
                      <span className="block font-mono text-[10px] uppercase tracking-wider text-red font-bold">
                        Masalah / Kekurangan Terdeteksi:
                      </span>
                      <p className="text-ink leading-relaxed">{f.issue}</p>
                    </div>

                    <div className="rounded-lg border border-green/20 bg-[#ECFDF5]/60 p-3 space-y-1">
                      <span className="block font-mono text-[10px] uppercase tracking-wider text-[#065F46] font-bold">
                        Rekomendasi Tindakan Perbaikan:
                      </span>
                      <p className="text-ink-soft leading-relaxed">{f.suggestion}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {message && (
        <div
          role="status"
          className="rounded-xl border border-green bg-[#ECFDF5] px-4 py-3 text-xs font-medium text-[#065F46]"
        >
          {message}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red bg-[#FEF2F2] px-4 py-3 text-xs font-medium text-red"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          onClick={onSave}
          disabled={busy}
          className="rounded-xl bg-ink px-6 py-2.5 font-mono text-xs uppercase tracking-wider font-bold text-white transition-all hover:bg-red disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Menyimpan…" : "Simpan Perubahan Skor"}
        </button>
        <Link
          href="/"
          className="rounded-xl border border-line bg-card px-5 py-2.5 font-mono text-xs text-ink transition-colors hover:border-ink"
        >
          ← Kembali ke Buku Nilai
        </Link>
      </div>
    </div>
  );
}
