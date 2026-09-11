"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setFileList(list: File[]) {
    setFiles(list);
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      for (const f of list) dt.items.add(f);
      fileInputRef.current.files = dt.files;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;

    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const form = new FormData();
      if (studentName.trim()) form.set("studentName", studentName.trim());
      if (topic.trim()) form.set("topic", topic.trim());
      for (const file of files) {
        form.append("files", file);
      }
      const res = await fetch("/api/assess", { method: "POST", body: form });
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
    <section aria-label="Form penilaian laporan">
      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-lg border border-line bg-card p-6 shadow-[0_1px_2px_rgba(20,33,46,0.04)]"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="studentName"
              className="block font-mono text-xs uppercase tracking-wider text-ink-soft"
            >
              Nama praktikan
            </label>
            <input
              id="studentName"
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Opsional"
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-red"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="topic"
              className="block font-mono text-xs uppercase tracking-wider text-ink-soft"
            >
              Topik praktikum
            </label>
            <input
              id="topic"
              type="text"
              list="topic-suggestions"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Cth: Praktikum 5 – BFS & DFS"
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-red"
            />
            <datalist id="topic-suggestions">
              {topics.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
        </div>

        <label
          htmlFor="files"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-hint px-4 py-10 text-center transition-colors hover:border-ink-soft"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = Array.from(e.dataTransfer.files);
            if (dropped.length) setFileList(dropped);
          }}
        >
          <span className="font-serif text-base font-semibold text-ink">
            Letakkan laporan di sini
          </span>
          <span className="text-sm text-ink-soft">
            atau klik untuk memilih beberapa file sekaligus (DOCX, PDF, MD, TXT, JPG, PNG)
          </span>
          <input
            id="files"
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            required
            className="sr-only"
            onChange={(e) => setFileList(Array.from(e.target.files ?? []))}
          />
        </label>

        {files.length > 0 && (
          <ul className="space-y-1.5">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center justify-between rounded-md border border-line bg-paper px-3 py-2 text-sm"
              >
                <span className="truncate text-ink">{f.name}</span>
                <span className="ml-3 shrink-0 font-mono text-xs text-ink-soft">
                  {Math.max(1, Math.round(f.size / 1024))} KB
                </span>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p role="alert" className="rounded-md border border-red bg-[#FBECEA] px-3 py-2 text-sm text-red">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy || files.length === 0}
            className="rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Menilai…" : "Nilai Sekarang"}
          </button>
          {busy && <span className="text-sm text-ink-soft">diproses satu per satu agar tidak kena rate-limit</span>}
        </div>
      </form>

      {results && (
        <div className="mt-6 space-y-2">
          <h2 className="font-serif text-xl font-semibold text-ink">Hasil penilaian</h2>
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-line bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{r.fileName}</p>
                {r.ok ? (
                  <div className="space-y-0.5">
                    <p className="text-sm text-ink-soft">
                      Skor {r.overallScore} · {r.overallBand}
                    </p>
                    {r.findings && r.findings.length > 0 && (
                      <p className="font-mono text-xs text-red font-medium">
                        {r.findings.length} detail temuan kesalahan (halaman, bagian &amp; baris)
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-red">{r.error}</p>
                )}
              </div>

              {r.ok && r.assessmentId && (
                <a
                  href={`/assessment/${r.assessmentId}`}
                  className="ml-3 shrink-0 rounded-md border border-line bg-hint px-3 py-1.5 text-sm text-ink transition-colors hover:border-ink-soft"
                >
                  Lihat detail
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
