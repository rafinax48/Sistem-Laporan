"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import BandBadge from "@/app/components/band-badge";
import { getBand, Band } from "@/lib/types";

interface StudentOption {
  id: string;
  name: string;
  nim: string;
  className: string;
}

interface AssessViewProps {
  practicumId: string;
  practicumName: string;
  practicumSlot: string;
  totalMeetings: number;
  students: StudentOption[];
  referenceTopics: string[];
}

interface AssessmentResult {
  ok: boolean;
  fileName: string;
  assessmentId?: string;
  overallScore?: number;
  overallBand?: string;
  findings?: {
    page?: number | null;
    section?: string | null;
    line?: number | null;
    quote?: string | null;
    issue: string;
    suggestion?: string | null;
  }[];
  categories?: {
    name: string;
    score: number;
    comment: string;
    suggestion?: string | null;
  }[];
  error?: string;
}

export default function PracticumAssessView({
  practicumId,
  practicumName,
  practicumSlot,
  totalMeetings,
  students,
  referenceTopics,
}: AssessViewProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students[0]?.id || ""
  );
  const [meetingNumber, setMeetingNumber] = useState<number>(1);
  const [topic, setTopic] = useState<string>(referenceTopics[0] || "");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const assessmentStages = [
    "Membedah berkas PDF & mengekstrak konten teks serta nomor baris...",
    "Merender visual halaman & menganalisis tangkapan layar praktikum...",
    "Mengevaluasi rubrik UAD dengan AI Gemini 2.5 Flash...",
    "Menyusun rincian halaman, baris temuan & menyimpan ke buku nilai...",
  ];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      setStage(0);
      timer = setInterval(() => {
        setStage((prev) => (prev < 3 ? prev + 1 : prev));
      }, 2500);
    } else {
      setStage(0);
    }
    return () => clearInterval(timer);
  }, [loading]);

  const activeStudent = students.find((s) => s.id === selectedStudentId);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError("Silakan pilih atau seret berkas laporan PDF praktikan.");
      return;
    }

    if (!activeStudent && students.length > 0) {
      setError("Silakan pilih praktikan yang dinilai.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("files", file);
      formData.append("practicumId", practicumId);
      if (activeStudent) {
        formData.append("studentId", activeStudent.id);
        formData.append("studentName", `${activeStudent.name} (${activeStudent.nim})`);
      }
      formData.append("meetingNumber", String(meetingNumber));
      if (topic.trim()) {
        formData.append("topic", topic.trim());
      }

      const res = await fetch("/api/assess", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal melakukan penilaian.");
      }

      const firstResult: AssessmentResult =
        data.results && data.results[0]
          ? data.results[0]
          : { ok: false, fileName: file.name, error: "Tidak ada respons penilaian." };

      setResult(firstResult);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Form Penilaian Kolom Kiri */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(20,33,46,0.04)]">
            <h3 className="font-serif text-lg font-semibold text-ink">
              Unggah & Nilai Laporan
            </h3>
            <p className="mt-1 text-xs text-ink-soft">
              Pilih mahasiswa praktikan, pertemuan, dan lampirkan PDF laporan mahasiswa untuk dinilai otomatis.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Pemilihan Praktikan */}
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1">
                  Nama Praktikan *
                </label>
                {students.length === 0 ? (
                  <div className="rounded-md border border-line bg-hint/30 p-3 text-xs text-ink-soft">
                    Belum ada praktikan terdaftar.{" "}
                    <Link
                      href={`/practicums/${practicumId}/students`}
                      className="text-red font-semibold underline"
                    >
                      + Tambah Praktikan
                    </Link>
                  </div>
                ) : (
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full rounded-md border border-line bg-card px-3 py-2 text-xs font-medium text-ink focus:border-red focus:outline-none"
                  >
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        [{st.className}] {st.nim} — {st.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Pemilihan Pertemuan & Topik */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1">
                    Pertemuan Ke-
                  </label>
                  <select
                    value={meetingNumber}
                    onChange={(e) => setMeetingNumber(Number(e.target.value))}
                    className="w-full rounded-md border border-line bg-card px-3 py-2 font-mono text-xs text-ink focus:border-red focus:outline-none"
                  >
                    {Array.from({ length: totalMeetings }, (_, i) => i + 1).map(
                      (num) => (
                        <option key={num} value={num}>
                          P{String(num).padStart(2, "0")}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1">
                    Kunci Jawaban / Topik
                  </label>
                  {referenceTopics.length > 0 ? (
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full rounded-md border border-line bg-card px-3 py-2 text-xs text-ink focus:border-red focus:outline-none"
                    >
                      {referenceTopics.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Topik / Modul"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full rounded-md border border-line bg-card px-3 py-2 text-xs text-ink focus:border-red focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Dropzone PDF */}
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1">
                  Berkas Laporan Mahasiswa (PDF) *
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-red bg-red/5"
                      : file
                      ? "border-green/50 bg-[#E6F4EC]/30"
                      : "border-line bg-hint/20 hover:border-ink-soft hover:bg-hint/40"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFile(e.target.files[0]);
                      }
                    }}
                  />

                  {file ? (
                    <div className="space-y-1">
                      <span className="text-2xl">📄</span>
                      <p className="font-mono text-xs font-semibold text-ink break-all">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-ink-soft">
                        {(file.size / 1024).toFixed(1)} KB • Klik untuk ganti
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-2xl opacity-60">📁</span>
                      <p className="text-xs font-medium text-ink">
                        Tarik & Lepas berkas laporan di sini
                      </p>
                      <p className="text-[11px] text-ink-soft">
                        atau klik untuk memilih dari komputer (PDF / Word)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-red/30 bg-[#FBECEA] p-3 text-xs text-red">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !file}
                className="w-full rounded-md bg-red py-2.5 font-mono text-xs uppercase tracking-wider text-white shadow-sm hover:bg-red-deep transition-colors disabled:opacity-50"
              >
                {loading ? "Sedang Mengevaluasi..." : "🚀 Mulai Koreksi AI"}
              </button>
            </form>
          </div>
        </div>

        {/* Panel Hasil Koreksi Kolom Kanan */}
        <div className="lg:col-span-7 space-y-6">
          {loading ? (
            <div className="rounded-xl border border-line bg-card p-10 text-center space-y-4">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-red border-t-transparent" />
              <div>
                <h4 className="font-serif text-base font-semibold text-ink">
                  Mengevaluasi Laporan Praktikum...
                </h4>
                <p className="mt-1 font-mono text-xs text-red transition-all">
                  {assessmentStages[stage]}
                </p>
              </div>
              <p className="text-[11px] text-ink-soft max-w-sm mx-auto">
                Model AI sedang membedah ketepatan kode, tangkapan layar, dan struktur laporan praktikan berdasarkan rubrik resmi UAD.
              </p>
            </div>
          ) : result ? (
            <div className="rounded-xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(20,33,46,0.04)] space-y-6">
              {/* Hasil Header */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
                <div>
                  <span className="font-mono text-xs text-ink-soft uppercase tracking-wider">
                    Hasil Evaluasi Selesai
                  </span>
                  <h3 className="font-serif text-xl font-bold text-ink">
                    {activeStudent?.name || "Praktikan"} (P{String(meetingNumber).padStart(2, "0")})
                  </h3>
                  <p className="font-mono text-xs text-ink-soft">
                    Berkas: {result.fileName}
                  </p>
                </div>

                {result.overallScore !== undefined && (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="block font-mono text-[10px] uppercase text-ink-soft">
                        Skor Akhir
                      </span>
                      <span className="font-mono text-3xl font-black text-ink">
                        {result.overallScore}
                      </span>
                    </div>
                    {result.overallBand && (
                      <BandBadge band={result.overallBand as Band} />
                    )}
                  </div>
                )}
              </div>

              {/* Rincian Kategori Rubrik */}
              {result.categories && result.categories.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
                    Rincian Rubrik Penilaian:
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {result.categories.map((cat) => (
                      <div
                        key={cat.name}
                        className="rounded-lg border border-line bg-hint/20 p-3.5 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] capitalize text-ink-soft">
                            {cat.name.replace(/_/g, " ")}
                          </span>
                          <span className="font-mono text-sm font-bold text-ink">
                            {cat.score}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink leading-relaxed line-clamp-3">
                          {cat.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Temuan Kesalahan / Perbaikan */}
              {result.findings && result.findings.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
                    Temuan Kesalahan & Lokasi Baris Dokumen ({result.findings.length} Catatan):
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {result.findings.map((f, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-line bg-paper p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center gap-2 font-mono text-[10px] text-ink-soft">
                          {f.page && (
                            <span className="rounded bg-hint px-1.5 py-0.5 font-semibold text-ink">
                              Halaman {f.page}
                            </span>
                          )}
                          {f.section && (
                            <span className="rounded bg-hint px-1.5 py-0.5 text-ink">
                              {f.section}
                            </span>
                          )}
                          {f.line && (
                            <span className="rounded bg-red/10 text-red px-1.5 py-0.5 font-bold">
                              Baris {f.line}
                            </span>
                          )}
                        </div>
                        {f.quote && (
                          <p className="font-mono text-[11px] text-ink-soft italic border-l-2 border-line pl-2 my-1">
                            &quot;{f.quote}&quot;
                          </p>
                        )}
                        <p className="text-ink font-medium">{f.issue}</p>
                        {f.suggestion && (
                          <p className="text-[11px] text-[#1E7A46]">
                            💡 <b>Saran:</b> {f.suggestion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Aksi Navigasi */}
              <div className="flex items-center justify-between border-t border-line pt-4">
                <Link
                  href={`/practicums/${practicumId}`}
                  className="font-mono text-xs text-red font-semibold hover:underline"
                >
                  ← Lihat Nilai di Buku Nilai Matriks
                </Link>
                {result.assessmentId && (
                  <Link
                    href={`/assessment/${result.assessmentId}`}
                    className="rounded-md bg-ink px-3 py-1.5 font-mono text-xs text-white hover:bg-red transition-colors"
                  >
                    Buka Laporan Penuh →
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-card p-10 text-center space-y-3">
              <span className="text-4xl opacity-50">📋</span>
              <h4 className="font-serif text-lg font-semibold text-ink">
                Siap Melakukan Penilaian
              </h4>
              <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
                Pilih nama mahasiswa dan nomor pertemuan di sebelah kiri, lalu unggah dokumen PDF laporan untuk memulai penilaian otomatis berbasis AI.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
