"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BandBadge from "@/app/components/band-badge";
import { getBand, Band } from "@/lib/types";
import { getUserProfile } from "@/lib/user-profile";

type ResultItem = {
  ok: boolean;
  fileName: string;
  assessmentId?: string;
  overallScore?: number;
  overallBand?: string;
  findings?: { page?: number | null; section?: string | null; line?: number | null; issue: string }[];
  error?: string;
};

const ACCEPT = ".docx,.pdf,.md,.txt,.jpg,.jpeg,.png";

export default function UploadForm({ topics }: { topics: string[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [studentName, setStudentName] = useState("");
  const [topic, setTopic] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const profile = getUserProfile();
    if (profile?.name) {
      setStudentName(`${profile.name} (${profile.nim})`);
    }
  }, []);

  function setFileList(list: File[]) {
    setFiles(list);
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      for (const f of list) dt.items.add(f);
      fileInputRef.current.files = dt.files;
    }
  }

  function removeFile(indexToRemove: number) {
    const next = files.filter((_, i) => i !== indexToRemove);
    setFileList(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;

    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const profile = getUserProfile();
      const form = new FormData();
      if (studentName.trim()) form.set("studentName", studentName.trim());
      if (topic.trim()) form.set("topic", topic.trim());
      if (profile?.apiKey) form.set("apiKey", profile.apiKey);
      for (const file of files) {
        form.append("files", file);
      }
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: {
          ...(profile?.apiKey ? { "x-gemini-api-key": profile.apiKey } : {}),
        },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menilai laporan.");
        return;
      }
      setResults(data.results);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Form penilaian mandiri" className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_rgba(11,19,43,0.04)]"
      >
        <div className="border-b border-line pb-4">
          <span className="font-mono text-xs uppercase tracking-wider text-uad-gold font-bold">
            Evaluasi Mandiri / Batch
          </span>
          <h2 className="font-serif text-xl font-bold text-ink mt-0.5">
            Penilaian Cepat Laporan Mahasiswa
          </h2>
          <p className="text-xs text-ink-soft">
            Gunakan mode ini untuk mengevaluasi satu atau banyak berkas laporan sekaligus tanpa perlu memilih sel matriks pertemuan tertentu.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="studentName"
              className="block font-mono text-xs uppercase tracking-wider text-ink-soft font-semibold"
            >
              Nama Praktikan (Opsional)
            </label>
            <input
              id="studentName"
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Contoh: Rafi Satya Prayoga"
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink focus:border-uad-gold focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="topic"
              className="block font-mono text-xs uppercase tracking-wider text-ink-soft font-semibold"
            >
              Topik Praktikum
            </label>
            <input
              id="topic"
              type="text"
              list="topic-suggestions"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Pilih atau ketik topik (cth: Praktikum 04)"
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink focus:border-uad-gold focus:outline-none"
            />
            <datalist id="topic-suggestions">
              {topics.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const dropped = Array.from(e.dataTransfer.files);
            if (dropped.length) setFileList(dropped);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-all ${
            isDragging
              ? "border-uad-gold bg-[#FEF3C7]/30 scale-[0.99]"
              : "border-line bg-hint/30 hover:border-uad-gold hover:bg-[#FEF3C7]/15"
          }`}
        >
          <span className="text-3xl">📂</span>
          <div className="space-y-1">
            <p className="font-serif text-sm font-semibold text-ink">
              Tarik &amp; letakkan berkas laporan di sini, atau klik untuk memilih
            </p>
            <p className="font-mono text-xs text-ink-soft">
              Mendukung PDF (beserta visual/gambar), DOCX, Markdown (.md), TXT, JPG, PNG
            </p>
          </div>
          <input
            id="files"
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            required={files.length === 0}
            className="hidden"
            onChange={(e) => setFileList(Array.from(e.target.files ?? []))}
          />
        </div>

        {/* Daftar File Terpilih */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-ink-soft uppercase">
                {files.length} Berkas Dipilih:
              </span>
              <button
                type="button"
                onClick={() => setFileList([])}
                className="font-mono text-[11px] text-red hover:underline"
              >
                Hapus Semua
              </button>
            </div>
            <ul className="max-h-48 overflow-y-auto divide-y divide-line rounded-lg border border-line bg-paper">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">📄</span>
                    <span className="truncate font-medium text-ink">{f.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-[11px] text-ink-soft">
                      {(f.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(i);
                      }}
                      className="text-ink-soft hover:text-red font-mono"
                      title="Hapus berkas ini"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red/40 bg-[#FEF2F2] p-3 text-xs text-red">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={busy || files.length === 0}
            className="rounded-lg bg-ink px-5 py-2.5 font-mono text-xs uppercase tracking-wider font-bold text-white transition-all hover:bg-red disabled:opacity-50 flex items-center gap-2"
          >
            {busy ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Mengevaluasi {files.length} Berkas...
              </>
            ) : (
              `Mulai Evaluasi (${files.length} Berkas)`
            )}
          </button>
          {busy && (
            <span className="font-mono text-[11px] text-ink-soft">
              Memproses secara sequential agar stabil &amp; mematuhi batas rate-limit
            </span>
          )}
        </div>
      </form>

      {/* Hasil Evaluasi */}
      {results && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <h3 className="font-serif text-lg font-bold text-ink">
              Hasil Evaluasi Berkas ({results.length})
            </h3>
            <span className="font-mono text-xs text-ink-soft">
              {results.filter((r) => r.ok).length} Berhasil ·{" "}
              {results.filter((r) => !r.ok).length} Gagal
            </span>
          </div>

          <div className="grid gap-3">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-line bg-card p-4 shadow-xs"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-bold text-ink">{r.fileName}</p>
                    {r.ok && r.overallScore !== undefined && (
                      <BandBadge band={getBand(r.overallScore) as Band} />
                    )}
                  </div>

                  {r.ok ? (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                      <span className="font-mono font-bold text-ink">
                        Skor: {r.overallScore} / 100
                      </span>
                      {r.findings && r.findings.length > 0 && (
                        <span className="font-mono text-xs text-red font-medium">
                          • {r.findings.length} temuan kekurangan/kesalahan spesifik
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-red font-medium">{r.error}</p>
                  )}
                </div>

                {r.ok && r.assessmentId && (
                  <Link
                    href={`/assessment/${r.assessmentId}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line bg-hint px-3 py-1.5 font-mono text-xs font-semibold text-ink hover:border-ink hover:bg-card transition-colors"
                  >
                    Detail Nilai &amp; Temuan →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
