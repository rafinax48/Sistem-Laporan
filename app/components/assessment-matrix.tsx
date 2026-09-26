"use client";

import { useState, useRef, useTransition, useMemo, useEffect } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { getBand, Band } from "@/lib/types";
import { getUserProfile } from "@/lib/user-profile";
import { getBasisDataModule } from "@/lib/curriculum/basis-data";

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
  students: initialStudents,
  initialMatrix,
  referenceTopics,
}: AssessmentMatrixProps) {
  const [studentList, setStudentList] = useState<StudentData[]>(initialStudents);
  const [matrix, setMatrix] = useState(initialMatrix);
  const [search, setSearch] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [, startTransition] = useTransition();

  // State Modal Input / Perbaikan Laporan
  const [modalOpen, setModalOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState<StudentData | null>(null);
  const [activeMeeting, setActiveMeeting] = useState<number>(1);
  const [isRevision, setIsRevision] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(referenceTopics[0] || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingAssess, setLoadingAssess] = useState(false);
  const [assessStage, setAssessStage] = useState(0);
  const [modalError, setModalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Modal Edit Data Praktikan
  const [editingStudent, setEditingStudent] = useState<StudentData | null>(null);
  const [editName, setEditName] = useState("");
  const [editNim, setEditNim] = useState("");
  const [editClass, setEditClass] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Animasi tahapan evaluasi AI
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loadingAssess) {
      setAssessStage(0);
      timer = setInterval(() => {
        setAssessStage((prev) => (prev < 3 ? prev + 1 : prev));
      }, 2400);
    } else {
      setAssessStage(0);
    }
    return () => clearInterval(timer);
  }, [loadingAssess]);

  const assessmentStages = [
    "Membedah struktur berkas & mengekstrak penomoran baris...",
    "Merender visual kanvas dokumen & analisis tangkapan layar...",
    "Mengevaluasi rubrik (struktur, isi, kedalaman) dengan AI Gemini...",
    "Menyusun rincian temuan kesalahan & finalisasi buku nilai...",
  ];

  // Daftar kelas unik untuk filter
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    for (const s of studentList) {
      if (s.className) set.add(s.className.toUpperCase());
    }
    return Array.from(set).sort();
  }, [studentList]);

  // Statistik Kelas (KPI)
  const kpiStats = useMemo(() => {
    const totalStudents = studentList.length;
    const totalPossibleSlots = totalStudents * totalMeetings;
    let gradedCount = 0;
    let totalScoreSum = 0;
    let needRevisionCount = 0;

    for (const st of studentList) {
      const studentScores = matrix[st.id];
      if (!studentScores) continue;
      for (const cell of Object.values(studentScores)) {
        if (cell.overallScore !== null && cell.overallScore !== undefined) {
          gradedCount++;
          totalScoreSum += cell.overallScore;
          if (cell.overallScore < 50) {
            needRevisionCount++;
          }
        }
      }
    }

    const classAverage = gradedCount > 0 ? (totalScoreSum / gradedCount).toFixed(1) : "—";
    const completionPercent =
      totalPossibleSlots > 0 ? Math.round((gradedCount / totalPossibleSlots) * 100) : 0;

    return {
      totalStudents,
      gradedCount,
      classAverage,
      completionPercent,
      needRevisionCount,
    };
  }, [studentList, matrix, totalMeetings]);

  // Edit Mahasiswa
  const startEditStudent = (st: StudentData) => {
    setEditingStudent(st);
    setEditName(st.name);
    setEditNim(st.nim);
    setEditClass(st.className);
    setEditError(null);
  };

  const handleEditStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditError(null);

    if (!editName.trim() || !editNim.trim() || !editClass.trim()) {
      setEditError("Nama, NIM, dan Kelas wajib diisi seluruhnya.");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/practicums/${practicumId}/students/${editingStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          nim: editNim.trim(),
          className: editClass.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui data praktikan.");
      }

      setStudentList((prev) =>
        prev.map((s) => (s.id === editingStudent.id ? { ...s, ...data.student } : s))
      );
      setEditingStudent(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setEditError(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  // Filter Mahasiswa (Pencarian + Kelas)
  const filteredStudents = useMemo(() => {
    return studentList.filter((s) => {
      if (selectedClassFilter !== "all" && s.className.toUpperCase() !== selectedClassFilter) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.nim.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
      );
    });
  }, [studentList, search, selectedClassFilter]);

  // Buka Modal untuk Input Baru atau Perbaikan
  const openUploadModal = (student: StudentData, meeting: number, revision: boolean) => {
    setActiveStudent(student);
    setActiveMeeting(meeting);
    setIsRevision(revision);
    setSelectedFile(null);
    setModalError(null);
    const mod = getBasisDataModule(meeting);
    if (mod) {
      setSelectedTopic(mod.topic);
    }
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

    const profile = getUserProfile();
    const formData = new FormData();
    formData.append("files", selectedFile);
    formData.append("practicumId", practicumId);
    formData.append("studentId", activeStudent.id);
    formData.append("meetingNumber", String(activeMeeting));
    formData.append("topic", selectedTopic || "");
    if (isRevision) {
      formData.append("isRevision", "true");
    }
    if (profile?.apiKey) {
      formData.append("apiKey", profile.apiKey);
    }

    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: {
          ...(profile?.apiKey ? { "x-gemini-api-key": profile.apiKey } : {}),
        },
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
      .filter((s): s is number => s !== null && s !== undefined);
    if (scores.length === 0) return "—";
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return avg.toFixed(1);
  };

  // Warna skor berdasarkan band (Estetika Akademik Presisi)
  const getScoreBadgeClass = (score: number | null): string => {
    if (score === null) return "text-ink-soft bg-hint border-line";
    const band: Band = getBand(score);
    if (band === "Sangat Bagus") {
      return "text-[#065F46] bg-[#ECFDF5] border-[#A7F3D0] hover:bg-[#D1FAE5]";
    }
    if (band === "Lumayan") {
      return "text-[#92400E] bg-[#FFFBEB] border-[#FDE68A] hover:bg-[#FEF3C7]";
    }
    return "text-[#991B1B] bg-[#FEF2F2] border-[#FECACA] hover:bg-[#FEE2E2]";
  };

  // Ekspor Rekap Nilai ke Excel
  const handleExportExcel = () => {
    const headers = [
      "No",
      "NIM",
      "Nama Mahasiswa",
      "Kelas",
      ...Array.from({ length: totalMeetings }, (_, i) => `P${i + 1}`),
      "Rata-rata",
      "Predikat",
    ];

    const rows = studentList.map((st, idx) => {
      const scores = Array.from({ length: totalMeetings }, (_, i) => {
        const cell = matrix[st.id]?.[i + 1];
        return cell && cell.overallScore !== null ? cell.overallScore : "";
      });

      const numericScores = scores.filter((s): s is number => typeof s === "number");
      const avg =
        numericScores.length > 0
          ? (numericScores.reduce((a, b) => a + b, 0) / numericScores.length).toFixed(1)
          : "";
      const predikat = avg !== "" ? getBand(Number(avg)) : "";

      return [idx + 1, st.nim, st.name, st.className, ...scores, avg, predikat];
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      [`UNIVERSITAS AHMAD DAHLAN — LABORATORIUM INFORMATIKA`],
      [`BUKU NILAI PRAKTIKUM: ${practicumName.toUpperCase()} (${practicumSlot})`],
      [`Tanggal Ekspor: ${new Date().toLocaleString("id-ID")}`],
      [],
      headers,
      ...rows,
    ]);

    // Set lebar kolom otomatis
    ws["!cols"] = [
      { wch: 5 },
      { wch: 14 },
      { wch: 30 },
      { wch: 8 },
      ...Array.from({ length: totalMeetings }, () => ({ wch: 8 })),
      { wch: 10 },
      { wch: 15 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Buku Nilai");
    const sanitizedName = practicumName.replace(/[^a-zA-Z0-9]/g, "_");
    XLSX.writeFile(
      wb,
      `Buku_Nilai_${sanitizedName}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const meetings = Array.from({ length: totalMeetings }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* KPI Bar Ringkasan Kelas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-card p-4 shadow-[0_1px_3px_rgba(11,19,43,0.03)]">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
            Total Praktikan
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-ink">
              {kpiStats.totalStudents}
            </span>
            <span className="text-xs text-ink-soft">mahasiswa</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-card p-4 shadow-[0_1px_3px_rgba(11,19,43,0.03)]">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
            Rata-rata Kelas
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-ink">
              {kpiStats.classAverage}
            </span>
            <span className="text-xs text-ink-soft">/ 100</span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-card p-4 shadow-[0_1px_3px_rgba(11,19,43,0.03)]">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
            Progres Keterisian
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-ink">
              {kpiStats.completionPercent}%
            </span>
            <span className="text-xs text-ink-soft">
              ({kpiStats.gradedCount} tugas dinilai)
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-card p-4 shadow-[0_1px_3px_rgba(11,19,43,0.03)]">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
            Perlu Perbaikan
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-red">
              {kpiStats.needRevisionCount}
            </span>
            <span className="text-xs text-ink-soft">laporan (&lt;50)</span>
          </div>
        </div>
      </div>

      {/* Toolbar Atas: Judul, Tombol Ekspor, dan Filter Kelas */}
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-card p-4 shadow-[0_1px_3px_rgba(11,19,43,0.03)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-uad-gold font-bold">
                LEMBAR BUKU NILAI
              </span>
              <span className="text-line">•</span>
              <span className="font-mono text-xs text-ink-soft">{practicumSlot}</span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-ink mt-0.5">
              {practicumName}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 font-mono text-xs font-semibold text-ink hover:border-ink hover:bg-hint transition-all"
              title="Unduh seluruh rekap nilai dalam format Excel (.xlsx)"
            >
              <span>📥</span>
              <span>Ekspor Excel (.xlsx)</span>
            </button>
            <Link
              href="/practicums"
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 font-mono text-xs font-semibold text-white hover:bg-red transition-all"
            >
              <span>+ Kelola Praktikan</span>
            </Link>
          </div>
        </div>

        {/* Baris Filter & Pencarian */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-line/60">
          {/* Filter Kelas */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="font-mono text-[11px] text-ink-soft uppercase mr-1">
              Kelas:
            </span>
            <button
              type="button"
              onClick={() => setSelectedClassFilter("all")}
              className={`rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-all ${
                selectedClassFilter === "all"
                  ? "bg-ink text-white shadow-xs"
                  : "bg-paper text-ink-soft hover:bg-hint hover:text-ink border border-line"
              }`}
            >
              Semua ({studentList.length})
            </button>
            {uniqueClasses.map((cls) => {
              const count = studentList.filter((s) => s.className.toUpperCase() === cls).length;
              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setSelectedClassFilter(cls)}
                  className={`rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-all ${
                    selectedClassFilter === cls
                      ? "bg-ink text-white shadow-xs"
                      : "bg-paper text-ink-soft hover:bg-hint hover:text-ink border border-line"
                  }`}
                >
                  Kelas {cls} ({count})
                </button>
              );
            })}
          </div>

          {/* Pencarian */}
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Cari nama praktikan, NIM, kelas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-xs text-ink placeholder:text-ink-soft focus:border-uad-gold focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Grid Matriks Ala Excel */}
      {studentList.length === 0 ? (
        <div className="rounded-xl border border-line bg-card px-5 py-12 text-center space-y-3 shadow-xs">
          <p className="font-serif text-lg font-semibold text-ink">
            Belum Ada Praktikan Terdaftar
          </p>
          <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
            Praktikum ini belum memiliki data praktikan. Anda dapat menambahkan praktikan secara manual atau mengimpor berkas Excel (XLSX/CSV) dengan kolom Nama, NIM, dan Kelas.
          </p>
          <Link
            href="/practicums"
            className="inline-flex rounded-lg bg-ink px-4 py-2 font-mono text-xs font-semibold text-white hover:bg-red transition-colors"
          >
            + Kelola Praktikan Sekarang
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-card shadow-[0_1px_3px_rgba(11,19,43,0.06)]">
          <div className="overflow-x-auto max-h-[640px] scrollbar-thin">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-20 bg-[#F1F5F9] border-b-2 border-line">
                <tr className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
                  <th className="sticky left-0 z-30 bg-[#F1F5F9] px-3 py-3 w-10 border-r border-line text-center">
                    No
                  </th>
                  <th className="sticky left-10 z-30 bg-[#F1F5F9] px-3 py-3 min-w-[110px] border-r border-line">
                    NIM
                  </th>
                  <th className="sticky left-[150px] z-30 bg-[#F1F5F9] px-4 py-3 min-w-[200px] border-r border-line">
                    Nama Mahasiswa
                  </th>
                  <th className="px-3 py-3 min-w-[60px] border-r border-line text-center">
                    Kelas
                  </th>
                  {meetings.map((m) => {
                    const mod = getBasisDataModule(m);
                    return (
                      <th
                        key={m}
                        className="px-2.5 py-2.5 min-w-[115px] text-center border-r border-line bg-[#E2E8F0]/40 font-bold group cursor-pointer hover:bg-[#E2E8F0]/80 transition-colors"
                        title={mod ? `P${m}: ${mod.topic}` : `Pertemuan ${m}`}
                      >
                        <div className="text-ink">P{m < 10 ? `0${m}` : m}</div>
                        {mod && (
                          <div className="text-[9px] font-normal text-ink-soft truncate max-w-[100px] mx-auto">
                            {mod.topic.split(" ")[0]}...
                          </div>
                        )}
                      </th>
                    );
                  })}
                  <th className="px-4 py-3 min-w-[85px] text-center font-bold text-ink bg-hint">
                    Rata²
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5 + totalMeetings}
                      className="py-10 text-center text-xs font-mono text-ink-soft"
                    >
                      Tidak ada praktikan yang cocok dengan kriteria pencarian &ldquo;{search}&rdquo;.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st, idx) => {
                    const avgScore = getAverageScore(st.id);
                    return (
                      <tr
                        key={st.id}
                        className="hover:bg-hint/50 transition-colors group"
                      >
                        {/* Sticky Kolom No */}
                        <td className="sticky left-0 z-10 bg-card group-hover:bg-hint/50 px-3 py-2.5 font-mono text-center text-ink-soft border-r border-line">
                          {idx + 1}
                        </td>

                        {/* Sticky Kolom NIM */}
                        <td className="sticky left-10 z-10 bg-card group-hover:bg-hint/50 px-3 py-2.5 font-mono text-ink font-semibold border-r border-line">
                          {st.nim}
                        </td>

                        {/* Sticky Kolom Nama */}
                        <td className="sticky left-[150px] z-10 bg-card group-hover:bg-hint/50 px-4 py-2.5 font-medium text-ink border-r border-line max-w-[240px]">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="truncate" title={st.name}>
                              {st.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditStudent(st)}
                              title="Koreksi nama, NIM, atau kelas"
                              className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-[10px] text-ink-soft opacity-30 hover:opacity-100 hover:bg-hint hover:text-red transition-all"
                            >
                              ✎ Edit
                            </button>
                          </div>
                        </td>

                        {/* Kolom Kelas */}
                        <td className="px-3 py-2.5 text-center border-r border-line">
                          <span className="inline-block rounded bg-hint px-2 py-0.5 font-mono text-[11px] font-bold text-ink">
                            {st.className}
                          </span>
                        </td>

                        {/* Kolom Pertemuan P1..Pn */}
                        {meetings.map((m) => {
                          const cellData = matrix[st.id]?.[m];
                          return (
                            <td
                              key={m}
                              className="px-2 py-1.5 text-center border-r border-line align-middle"
                            >
                              {cellData && cellData.overallScore !== null ? (
                                // SUDAH DINILAI
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <div
                                    className={`inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 font-mono text-xs font-bold transition-transform hover:scale-105 ${getScoreBadgeClass(
                                      cellData.overallScore
                                    )}`}
                                    title={`Laporan: ${cellData.fileName} | Topik: ${cellData.topic || "Generik"}`}
                                  >
                                    <span>{cellData.overallScore}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px]">
                                    {cellData.assessmentId && (
                                      <Link
                                        href={`/assessment/${cellData.assessmentId}`}
                                        className="font-mono text-ink-soft hover:text-red hover:underline"
                                        title="Buka rincian penilaian & temuan kesalahan"
                                      >
                                        Detail
                                      </Link>
                                    )}
                                    <span className="text-line">•</span>
                                    <button
                                      type="button"
                                      onClick={() => openUploadModal(st, m, true)}
                                      className="font-mono text-ink-soft hover:text-red hover:underline"
                                      title="Unggah laporan perbaikan praktikan"
                                    >
                                      Revisi
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                // BELUM DINILAI -> TANDA INPUT LAPORAN
                                <button
                                  type="button"
                                  onClick={() => openUploadModal(st, m, false)}
                                  className="w-full rounded-md border border-dashed border-line bg-paper/60 py-1.5 px-2 font-mono text-[11px] text-ink-soft transition-all hover:border-uad-gold hover:bg-[#FEF3C7]/30 hover:text-ink focus:outline-none"
                                >
                                  + Nilai
                                </button>
                              )}
                            </td>
                          );
                        })}

                        {/* Kolom Rata-rata */}
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-ink bg-hint/30">
                          {avgScore}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog: Input Laporan / Perbaikan Laporan */}
      {modalOpen && activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-card p-6 shadow-2xl space-y-5">
            <div className="border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-wider text-uad-gold font-bold">
                  {isRevision ? "Perbaikan Laporan Praktikan" : "Penilaian Laporan Praktikum"}
                </span>
                <span className="rounded bg-hint px-2 py-0.5 font-mono text-[10px] font-bold text-ink">
                  P{activeMeeting < 10 ? `0${activeMeeting}` : activeMeeting}
                </span>
              </div>
              <h3 className="font-serif text-xl font-bold text-ink mt-1">
                {activeStudent.name}
              </h3>
              <p className="text-xs text-ink-soft">
                NIM: <span className="font-mono text-ink font-semibold">{activeStudent.nim}</span> · Kelas:{" "}
                <span className="font-mono text-ink font-semibold">{activeStudent.className}</span>
              </p>
            </div>

            {/* Animasi Proses Evaluasi Multimodal Real-time */}
            {loadingAssess ? (
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF3C7] text-uad-gold">
                  <span className="inline-block h-7 w-7 animate-spin rounded-full border-3 border-uad-gold border-t-transparent" />
                </div>
                <div className="space-y-1">
                  <p className="font-serif text-base font-semibold text-ink">
                    Mengevaluasi Laporan Mahasiswa...
                  </p>
                  <p className="font-mono text-xs text-uad-gold font-semibold transition-all">
                    {assessmentStages[assessStage]}
                  </p>
                  <p className="text-[11px] text-ink-soft">
                    Model AI sedang memverifikasi teks, baris kesalahan, dan lampiran visual.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAssessSubmit} className="space-y-4">
                {/* Pilihan Topik Referensi */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-mono text-[11px] uppercase tracking-wider text-ink-soft font-semibold">
                      Modul / Topik Referensi Acuan *
                    </label>
                    {getBasisDataModule(activeMeeting) && (
                      <span className="font-mono text-[10px] bg-red/10 text-red px-1.5 py-0.5 rounded font-bold">
                        Modul Resmi P{activeMeeting}
                      </span>
                    )}
                  </div>

                  {getBasisDataModule(activeMeeting) && (
                    <div className="mb-2 rounded-lg border border-red/20 bg-red/5 p-2.5 text-xs text-ink">
                      <div className="font-bold text-red font-mono text-[11px]">
                        Pertemuan {activeMeeting}: {getBasisDataModule(activeMeeting)?.topic}
                      </div>
                      <div className="text-[11px] text-ink-soft mt-0.5">
                        Standar materi dan rubrik penilaian otomatis dimuat dari modul resmi Basis Data 2026.
                      </div>
                    </div>
                  )}

                  {referenceTopics.length > 0 && (
                    <select
                      value={selectedTopic}
                      onChange={(e) => setSelectedTopic(e.target.value)}
                      className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink focus:border-uad-gold focus:outline-none"
                    >
                      {getBasisDataModule(activeMeeting) && !referenceTopics.includes(getBasisDataModule(activeMeeting)!.topic) && (
                        <option value={getBasisDataModule(activeMeeting)!.topic}>
                          [Modul Resmi] {getBasisDataModule(activeMeeting)!.topic}
                        </option>
                      )}
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
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1 font-semibold">
                    Berkas Laporan Mahasiswa *
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-hint/30 p-6 text-center transition-all hover:border-uad-gold hover:bg-[#FEF3C7]/20"
                  >
                    <span className="text-2xl mb-1">📄</span>
                    <p className="text-xs font-semibold text-ink">
                      {selectedFile ? selectedFile.name : "Klik untuk memilih berkas laporan mahasiswa"}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-ink-soft">
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                        : "Mendukung format PDF, DOCX, TXT, MD, JPG, PNG"}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.md,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setSelectedFile(f);
                      }}
                    />
                  </div>
                </div>

                {modalError && (
                  <div className="rounded-lg border border-red/40 bg-[#FEF2F2] p-3 text-xs text-red">
                    {modalError}
                  </div>
                )}

                {/* Tombol Aksi Modal */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    disabled={loadingAssess}
                    className="rounded-lg border border-line bg-hint px-4 py-2 font-mono text-xs text-ink hover:border-ink-soft disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={
                      loadingAssess ||
                      !selectedFile ||
                      (referenceTopics.length === 0 && !getBasisDataModule(activeMeeting))
                    }
                    className="rounded-lg bg-ink px-4 py-2 font-mono text-xs uppercase tracking-wider text-white transition-colors hover:bg-red disabled:opacity-50 flex items-center gap-2 font-bold"
                  >
                    {isRevision ? "Nilai Ulang (Perbaikan)" : "Mulai Evaluasi AI"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Edit Data Praktikan */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-uad-gold font-bold">
                  Koreksi Data Mahasiswa
                </span>
                <h3 className="font-serif text-lg font-semibold text-ink">
                  Edit Praktikan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="text-xs text-ink-soft hover:text-ink font-mono"
              >
                ✕ Tutup
              </button>
            </div>

            {editError && (
              <div className="rounded-lg border border-red/30 bg-[#FEF2F2] p-3 text-xs text-red">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditStudentSubmit} className="space-y-4">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-ink-soft font-semibold">
                  Nama Mahasiswa *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Contoh: Dimas Pratama Anugraha"
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink focus:border-uad-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-ink-soft font-semibold">
                  NIM *
                </label>
                <input
                  type="text"
                  required
                  value={editNim}
                  onChange={(e) => setEditNim(e.target.value)}
                  placeholder="Contoh: 2400018215"
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs font-mono text-ink focus:border-uad-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-ink-soft font-semibold">
                  Kelas *
                </label>
                <input
                  type="text"
                  required
                  maxLength={1}
                  value={editClass}
                  onChange={(e) => setEditClass(e.target.value.toUpperCase())}
                  placeholder="Contoh: A, B, atau C"
                  className="mt-1 w-24 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-mono font-bold text-center text-ink focus:border-uad-gold focus:outline-none uppercase"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="rounded-lg border border-line bg-hint px-3 py-1.5 text-xs text-ink hover:border-ink-soft"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-lg bg-ink px-4 py-1.5 font-mono text-xs text-white hover:bg-red disabled:opacity-50 font-bold"
                >
                  {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
