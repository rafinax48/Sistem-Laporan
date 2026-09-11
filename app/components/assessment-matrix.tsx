"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { getBand, Band } from "@/lib/types";

interface StudentData {
  id: string;
  name: string;
  nim: string;
  className: string;
}

interface AssessmentCell {
  reportId: string;
  assessmentId: string | null;
  overallScore: number | null;
  fileName: string;
  topic: string | null;
  createdAt: string;
}

interface AssessmentMatrixProps {
  practicumId: string;
  practicumName: string;
  practicumSlot: string;
  totalMeetings: number;
  students: StudentData[];
  initialMatrix: Record<string, Record<number, AssessmentCell>>;
  referenceTopics: string[];
}

export default function AssessmentMatrix({
  practicumId,
  practicumName,
  practicumSlot,
  totalMeetings,
  students,
  initialMatrix,
  referenceTopics,
}: AssessmentMatrixProps) {
  const [matrix, setMatrix] = useState(initialMatrix);
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  // State Modal Input / Perbaikan Laporan
  const [modalOpen, setModalOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState<StudentData | null>(null);
  const [activeMeeting, setActiveMeeting] = useState<number>(1);
  const [isRevision, setIsRevision] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(referenceTopics[0] || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingAssess, setLoadingAssess] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter Mahasiswa
  const filteredStudents = students.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.nim.toLowerCase().includes(q) || s.className.toLowerCase().includes(q);
  });

  // Buka Modal untuk Input Baru atau Perbaikan
  const openUploadModal = (student: StudentData, meeting: number, revision: boolean) => {
    setActiveStudent(student);
    setActiveMeeting(meeting);
    setIsRevision(revision);
    setSelectedFile(null);
    setModalError(null);
    setModalOpen(true);
  };

  // Submit Penilaian Laporan
  const handleAssessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setModalError("Pilih berkas laporan mahasiswa terlebih dahulu.");
      return;
    }
    if (!activeStudent) return;

    setLoadingAssess(true);
    setModalError(null);

    const formData = new FormData();
    formData.append("files", selectedFile);
    formData.append("practicumId", practicumId);
    formData.append("studentId", activeStudent.id);
    formData.append("meetingNumber", String(activeMeeting));
    formData.append("topic", selectedTopic || "");
    if (isRevision) {
      formData.append("isRevision", "true");
    }

    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal melakukan penilaian.");
      }

      const result = data.results?.[0];
      if (!result || !result.ok) {
        throw new Error(result?.error || "Proses evaluasi gagal.");
      }

      // Update sel pada matriks secara lokal
      startTransition(() => {
        setMatrix((prev) => {
          const studentRow = { ...(prev[activeStudent.id] || {}) };
          studentRow[activeMeeting] = {
            reportId: result.reportId,
            assessmentId: result.assessmentId,
            overallScore: result.overallScore,
            fileName: selectedFile.name,
            topic: selectedTopic || null,
            createdAt: new Date().toISOString(),
          };
          return {
            ...prev,
            [activeStudent.id]: studentRow,
          };
        });
      });

      setModalOpen(false);
      setSelectedFile(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setModalError(msg);
    } finally {
      setLoadingAssess(false);
    }
  };

  // Hitung Rata-rata Nilai Siswa
  const getAverageScore = (studentId: string): string => {
    const studentScores = matrix[studentId];
    if (!studentScores) return "—";
    const scores = Object.values(studentScores)
      .map((c) => c.overallScore)
      .filter((s): s is number => s !== null);
    if (scores.length === 0) return "—";
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return avg.toFixed(1);
  };

  // Warna skor berdasarkan band
  const getScoreBadgeClass = (score: number | null): string => {
    if (score === null) return "text-ink-soft bg-hint";
    const band: Band = getBand(score);
    if (band === "Sangat Bagus") return "text-[#1E7A46] bg-[#E6F4EC] border-[#1E7A46]/30";
    if (band === "Lumayan") return "text-[#B07D1B] bg-[#FBF3DE] border-[#B07D1B]/30";
    return "text-[#C0392B] bg-[#FBECEA] border-[#C0392B]/30";
  };

  const meetings = Array.from({ length: totalMeetings }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Header Info Matriks */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-red">
            Matriks Buku Nilai Praktikum
          </span>
          <h2 className="font-serif text-2xl font-semibold text-ink">
            {practicumName}
          </h2>
          <p className="text-xs text-ink-soft">
            Jadwal: <span className="font-semibold text-ink">{practicumSlot}</span> · Total:{" "}
            <b className="font-mono text-ink">{students.length}</b> Praktikan ·{" "}
            <b className="font-mono text-ink">{totalMeetings}</b> Pertemuan
          </p>
        </div>

        {/* Input Pencarian Praktikan */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Cari nama, NIM, kelas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-line bg-card px-3 py-1.5 text-xs text-ink placeholder:text-ink-soft focus:border-red focus:outline-none focus:ring-1 focus:ring-red"
          />
        </div>
      </div>

      {/* Grid Matriks Ala Excel */}
      {students.length === 0 ? (
        <div className="rounded-lg border border-line bg-card px-5 py-12 text-center space-y-3">
          <p className="font-serif text-lg font-semibold text-ink">
            Belum Ada Praktikan Terdaftar
          </p>
          <p className="text-xs text-ink-soft max-w-md mx-auto">
            Praktikum ini belum memiliki data praktikan. Tambahkan praktikan terlebih dahulu melalui menu <b>Praktikum</b>.
          </p>
          <Link
            href="/practicums"
            className="inline-flex rounded-md bg-ink px-4 py-2 font-mono text-xs text-white hover:bg-red transition-colors"
          >
            + Kelola Praktikan Sekarang
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-card shadow-[0_1px_3px_rgba(20,33,46,0.06)]">
          <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#F4F6F5] border-b-2 border-line">
                <tr className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
                  <th className="sticky left-0 z-20 bg-[#F4F6F5] px-3 py-3 w-10 border-r border-line text-center">
                    No
                  </th>
                  <th className="sticky left-10 z-20 bg-[#F4F6F5] px-4 py-3 min-w-[110px] border-r border-line">
                    NIM
                  </th>
                  <th className="sticky left-[150px] z-20 bg-[#F4F6F5] px-4 py-3 min-w-[180px] border-r border-line">
                    Nama Mahasiswa
                  </th>
                  <th className="px-3 py-3 min-w-[60px] border-r border-line text-center">
                    Kelas
                  </th>
                  {meetings.map((m) => (
                    <th
                      key={m}
                      className="px-3 py-3 min-w-[120px] text-center border-r border-line bg-[#EEF1F0]/50"
                    >
                      P{m}
                    </th>
                  ))}
                  <th className="px-4 py-3 min-w-[80px] text-center font-bold text-ink bg-hint">
                    Rata²
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredStudents.map((st, idx) => {
                  const avgScore = getAverageScore(st.id);
                  return (
                    <tr
                      key={st.id}
                      className="hover:bg-hint/40 transition-colors group"
                    >
                      {/* Sticky Kolom No */}
                      <td className="sticky left-0 z-10 bg-card group-hover:bg-hint/40 px-3 py-3 font-mono text-center text-ink-soft border-r border-line">
                        {idx + 1}
                      </td>

                      {/* Sticky Kolom NIM */}
                      <td className="sticky left-10 z-10 bg-card group-hover:bg-hint/40 px-4 py-3 font-mono text-ink font-medium border-r border-line">
                        {st.nim}
                      </td>

                      {/* Sticky Kolom Nama */}
                      <td className="sticky left-[150px] z-10 bg-card group-hover:bg-hint/40 px-4 py-3 font-medium text-ink border-r border-line truncate max-w-[220px]">
                        {st.name}
                      </td>

                      {/* Kolom Kelas */}
                      <td className="px-3 py-3 text-center border-r border-line">
                        <span className="rounded bg-hint px-2 py-0.5 font-mono text-[11px] font-bold text-ink">
                          {st.className}
                        </span>
                      </td>

                      {/* Kolom Pertemuan P1..Pn */}
                      {meetings.map((m) => {
                        const cellData = matrix[st.id]?.[m];
                        return (
                          <td
                            key={m}
                            className="px-2 py-2 text-center border-r border-line align-middle"
                          >
                            {cellData && cellData.overallScore !== null ? (
                              // SUDAH DINILAI
                              <div className="flex flex-col items-center justify-center gap-1">
                                <div
                                  className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-xs font-bold ${getScoreBadgeClass(
                                    cellData.overallScore
                                  )}`}
                                >
                                  <span>{cellData.overallScore}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px]">
                                  {cellData.assessmentId && (
                                    <Link
                                      href={`/assessment/${cellData.assessmentId}`}
                                      className="text-ink-soft hover:text-red underline-offset-1 hover:underline font-mono"
                                      title="Lihat Detail Nilai"
                                    >
                                      Hasil
                                    </Link>
                                  )}
                                  <span className="text-line">|</span>
                                  <button
                                    type="button"
                                    onClick={() => openUploadModal(st, m, true)}
                                    className="text-ink-soft hover:text-red underline-offset-1 hover:underline font-mono"
                                    title="Unggah ulang laporan revisi"
                                  >
                                    Perbaikan
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // BELUM DINILAI -> TANDA INPUT LAPORAN
                              <button
                                type="button"
                                onClick={() => openUploadModal(st, m, false)}
                                className="w-full rounded border border-dashed border-line bg-card/60 py-1.5 px-2 font-mono text-[11px] text-ink-soft transition-all hover:border-red hover:bg-[#FBECEA]/40 hover:text-red focus:outline-none"
                              >
                                + Input Laporan
                              </button>
                            )}
                          </td>
                        );
                      })}

                      {/* Kolom Rata-rata */}
                      <td className="px-3 py-3 text-center font-mono font-bold text-ink bg-hint/30">
                        {avgScore}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog: Input Laporan / Perbaikan Laporan */}
      {modalOpen && activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-line bg-card p-6 shadow-xl space-y-4">
            <div className="border-b border-line pb-3">
              <span className="font-mono text-xs uppercase tracking-wider text-red">
                {isRevision ? "Perbaikan Laporan (Input Ulang)" : "Input Laporan Praktikan"}
              </span>
              <h3 className="font-serif text-xl font-semibold text-ink mt-0.5">
                {activeStudent.name}
              </h3>
              <p className="text-xs text-ink-soft">
                NIM: <span className="font-mono text-ink">{activeStudent.nim}</span> · Kelas:{" "}
                <span className="font-mono text-ink">{activeStudent.className}</span> · Pertemuan:{" "}
                <b className="font-mono text-ink">P{activeMeeting}</b>
              </p>
            </div>

            <form onSubmit={handleAssessSubmit} className="space-y-4">
              {/* Pilihan Topik Referensi */}
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1">
                  Topik Referensi Pembanding *
                </label>
                {referenceTopics.length === 0 ? (
                  <div className="rounded-md border border-amber/40 bg-[#FBF3DE] p-3 text-xs text-[#B07D1B]">
                    Belum ada laporan referensi yang tersedia. Buat laporan referensi terlebih dahulu di menu <b>Referensi</b>.
                  </div>
                ) : (
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="w-full rounded-md border border-line bg-card px-3 py-2 text-xs text-ink focus:border-red focus:outline-none"
                  >
                    {referenceTopics.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Pemilihan File Laporan */}
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1">
                  Berkas Laporan Mahasiswa *
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-hint/20 p-5 text-center transition-colors hover:border-red hover:bg-[#FBECEA]/20"
                >
                  <p className="text-xs font-medium text-ink">
                    {selectedFile ? selectedFile.name : "Klik untuk memilih berkas laporan mahasiswa"}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-ink-soft">
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                      : "Mendukung PDF, DOCX, TXT, MD"}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setSelectedFile(f);
                    }}
                  />
                </div>
              </div>

              {modalError && (
                <div className="rounded-md border border-red/40 bg-[#FBECEA] p-3 text-xs text-red">
                  {modalError}
                </div>
              )}

              {/* Tombol Aksi Modal */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={loadingAssess}
                  className="rounded-md border border-line bg-hint px-3 py-2 font-mono text-xs text-ink hover:border-ink-soft disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loadingAssess || !selectedFile || referenceTopics.length === 0}
                  className="rounded-md bg-ink px-4 py-2 font-mono text-xs uppercase tracking-wider text-white transition-colors hover:bg-red disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingAssess ? (
                    <>
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Mengevaluasi dengan AI...
                    </>
                  ) : isRevision ? (
                    "Nilai Ulang (Perbaikan)"
                  ) : (
                    "Nilai Laporan Sekarang"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
