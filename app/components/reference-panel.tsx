"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ReferenceItem = {
  id: string;
  topic: string | null;
  fileName: string;
  fileType: string;
  createdAt: string;
  rawText: string | null;
};

export default function ReferencePanel({
  references,
}: {
  references: ReferenceItem[];
}) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("file", file);
      if (topic.trim()) form.set("topic", topic.trim());
      const res = await fetch("/api/reference", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "Gagal menyimpan referensi." });
        return;
      }
      setMessage({ ok: true, text: "Referensi tersimpan." });
      setFile(null);
      setTopic("");
      router.refresh();
    } catch (err) {
      setMessage({
        ok: false,
        text: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Hapus referensi ini?")) return;
    const res = await fetch(`/api/reference?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ ok: false, text: data.error ?? "Gagal menghapus." });
      return;
    }
    setMessage({ ok: true, text: "Referensi dihapus." });
    router.refresh();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      <form
        onSubmit={onSubmit}
        className="h-fit space-y-5 rounded-lg border border-line bg-card p-6 shadow-[0_1px_2px_rgba(20,33,46,0.04)]"
      >
        <h2 className="font-serif text-lg font-semibold text-ink">Buat referensi</h2>
        <div className="space-y-1.5">
          <label
            htmlFor="refTopic"
            className="block font-mono text-xs uppercase tracking-wider text-ink-soft"
          >
            Topik
          </label>
          <input
            id="refTopic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Cth: Praktikum 5 – BFS & DFS (kosongkan untuk referensi generik)"
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-red"
          />
          <p className="text-xs text-ink-soft">
            Kosongkan jika satu template generik dipakai untuk semua topik.
          </p>
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="refFile"
            className="block font-mono text-xs uppercase tracking-wider text-ink-soft"
          >
            File laporan sempurna
          </label>
          <input
            id="refFile"
            type="file"
            accept=".docx,.pdf,.md,.txt,.jpg,.jpeg,.png"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          />
        </div>
        {message && (
          <p
            role="status"
            className={`rounded-md border px-3 py-2 text-sm ${
              message.ok ? "border-green bg-[#E6F4EC] text-[#1E7A46]" : "border-red bg-[#FBECEA] text-red"
            }`}
          >
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !file}
          className="w-full rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Menyimpan…" : "Simpan Referensi"}
        </button>
      </form>

      <div>
        <h2 className="mb-4 font-serif text-lg font-semibold text-ink">
          Daftar referensi <span className="font-mono text-sm text-ink-soft">({references.length})</span>
        </h2>
        {references.length === 0 ? (
          <div className="rounded-lg border border-line bg-card px-5 py-10 text-center">
            <p className="font-serif text-lg font-semibold text-ink">Belum ada referensi</p>
            <p className="mt-1 text-sm text-ink-soft">
              Penilaian akan diblok sampai ada minimal satu referensi.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {references.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{r.fileName}</p>
                  <p className="font-mono text-xs text-ink-soft">
                    {r.topic ?? "generik"}
                    <span className="mx-1.5">·</span>
                    {new Date(r.createdAt).toLocaleString("id-ID", { dateStyle: "medium" })}
                  </p>
                  {r.rawText && (
                    <p className="mt-1 line-clamp-1 text-xs text-ink-soft">{r.rawText}</p>
                  )}
                </div>
                <button
                  onClick={() => onDelete(r.id)}
                  className="shrink-0 rounded-md border border-line bg-hint px-3 py-1.5 text-xs text-ink transition-colors hover:border-red hover:text-red"
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
