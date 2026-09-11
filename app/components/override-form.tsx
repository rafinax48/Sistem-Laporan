"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BandBadge from "@/app/components/band-badge";
import { getBand } from "@/lib/types";

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

  const overall = Math.round(
    categories.reduce((sum, c) => sum + c.score, 0) / Math.max(categories.length, 1),
  );
  const overallBand = getBand(overall);

  function update(index: number, patch: Partial<CategoryDraft>) {
    setCategories((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

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
      setMessage("Perubahan tersimpan.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-card px-5 py-4">
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-5xl font-bold leading-none text-ink">{overall}</span>
          <span className="font-mono text-sm text-ink-soft">/100</span>
        </div>
        <BandBadge band={overallBand} />
        <p className="ml-auto max-w-[16rem] text-right text-xs text-ink-soft">
          Skor akhir dihitung dari rata-rata skor ketiga kategori (dibulatkan).
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {categories.map((c, i) => (
          <div key={c.name} className="flex flex-col gap-3 rounded-lg border border-line bg-card p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-serif text-base font-semibold text-ink">{c.label}</h3>
              <BandBadge band={getBand(c.score)} />
            </div>
            <label className="space-y-1">
              <span className="block font-mono text-xs uppercase tracking-wider text-ink-soft">
                Skor 0–100
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={c.score}
                onChange={(e) => update(i, { score: Number(e.target.value) })}
                className="w-full rounded-lg border border-line bg-paper px-3 py-2 font-mono text-base font-semibold text-ink focus:border-red"
              />
            </label>
            <label className="space-y-1">
              <span className="block font-mono text-xs uppercase tracking-wider text-ink-soft">
                Komentar
              </span>
              <textarea
                rows={3}
                value={c.comment}
                onChange={(e) => update(i, { comment: e.target.value })}
                className="w-full resize-y rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-red"
              />
            </label>
            <label className="space-y-1">
              <span className="block font-mono text-xs uppercase tracking-wider text-ink-soft">
                Saran perbaikan
              </span>
              <textarea
                rows={3}
                value={c.suggestion}
                onChange={(e) => update(i, { suggestion: e.target.value })}
                className="w-full resize-y rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-red"
              />
            </label>
          </div>
        ))}
      </div>

      {findings && findings.length > 0 && (
        <section className="space-y-4" aria-label="Temuan Kesalahan Detail">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div>
              <h2 className="font-serif text-xl font-semibold text-ink">
                Detail Temuan &amp; Kesalahan ({findings.length})
              </h2>
              <p className="text-xs text-ink-soft">
                Pelacakan lokasi halaman, bab/bagian, dan perkiraan baris laporan yang perlu diperbaiki
              </p>
            </div>
            <span className="rounded-full bg-red/10 px-3 py-1 font-mono text-xs font-semibold text-red">
              {findings.length} Masalah
            </span>
          </div>

          <div className="grid gap-3">
            {findings.map((f, idx) => (
              <div
                key={f.id || idx}
                className="rounded-lg border border-line bg-card p-4 space-y-2.5 transition-colors hover:border-ink-soft"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-ink px-2 py-0.5 font-mono text-xs font-bold text-white">
                    #{idx + 1}
                  </span>
                  {f.page !== null && f.page !== undefined && (
                    <span className="rounded border border-line bg-hint px-2 py-0.5 font-mono text-xs font-semibold text-ink">
                      Halaman {f.page}
                    </span>
                  )}
                  {f.line !== null && f.line !== undefined && (
                    <span className="rounded border border-line bg-hint px-2 py-0.5 font-mono text-xs text-ink">
                      Baris {f.line}
                    </span>
                  )}
                  {f.section && (
                    <span className="rounded border border-line bg-paper px-2 py-0.5 text-xs font-medium text-ink-soft">
                      Bagian: {f.section}
                    </span>
                  )}
                </div>

                {f.quote && (
                  <blockquote className="rounded border-l-2 border-red bg-hint/60 px-3 py-1.5 font-mono text-xs text-ink italic">
                    "{f.quote}"
                  </blockquote>
                )}

                <div className="grid gap-3 sm:grid-cols-2 text-sm pt-1">
                  <div className="space-y-1">
                    <span className="block font-mono text-[11px] uppercase tracking-wider text-red font-semibold">
                      Kesalahan / Kekurangan:
                    </span>
                    <p className="text-ink text-xs leading-relaxed">{f.issue}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="block font-mono text-[11px] uppercase tracking-wider text-[#1E7A46] font-semibold">
                      Saran Perbaikan:
                    </span>
                    <p className="text-ink-soft text-xs leading-relaxed">{f.suggestion}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {message && (
        <p role="status" className="rounded-md border border-green bg-[#E6F4EC] px-3 py-2 text-sm text-[#1E7A46]">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md border border-red bg-[#FBECEA] px-3 py-2 text-sm text-red">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onSave}
          disabled={busy}
          className="rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Menyimpan…" : "Simpan Perubahan"}
        </button>
        <Link
          href="/"
          className="rounded-lg border border-line bg-hint px-5 py-2.5 text-sm text-ink transition-colors hover:border-ink-soft"
        >
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}

