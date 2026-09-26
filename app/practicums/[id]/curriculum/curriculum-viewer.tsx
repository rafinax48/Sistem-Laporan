"use client";

import { useState } from "react";
import Link from "next/link";
import { PracticumModule } from "@/lib/curriculum/basis-data";

interface CurriculumViewerProps {
  practicumId: string;
  practicumName: string;
  modules: PracticumModule[];
}

type TabType = "teori" | "langkah" | "pretest" | "posttest" | "rubrik" | "capaian";

export default function CurriculumViewer({
  practicumId,
  practicumName,
  modules,
}: CurriculumViewerProps) {
  const [selectedMeeting, setSelectedMeeting] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<TabType>("teori");
  const [copied, setCopied] = useState(false);

  const currentModule =
    modules.find((m) => m.meetingNumber === selectedMeeting) || modules[0];

  const handleCopyMarkdown = () => {
    if (!currentModule) return;
    navigator.clipboard.writeText(currentModule.referenceMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`/practicums/${practicumId}`}
              className="font-mono text-xs text-ink-soft hover:text-ink transition-colors flex items-center gap-1"
            >
              <span>← Buku Nilai</span>
            </Link>
            <span className="text-xs text-ink-soft">/</span>
            <span className="font-mono text-xs text-red font-semibold uppercase tracking-wider">
              Silabus & Panduan Materi
            </span>
          </div>
          <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            Modul Acuan Praktikum Basis Data
          </h1>
          <p className="mt-1 text-xs text-ink-soft max-w-2xl leading-relaxed">
            Kurikulum resmi 12 pertemuan berbasis <em>Outcome-Based Education (OBE) 2026</em>.
            Digunakan sebagai tolok ukur pengajaran dan standar penilaian evaluasi AI untuk laporan praktikan.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card px-3.5 py-2 font-mono text-xs font-semibold text-ink hover:border-ink-soft transition-colors shadow-sm"
          >
            <span>{copied ? "✓ Tersalin!" : "📋 Salin Modul Acuan (MD)"}</span>
          </button>
          <Link
            href={`/practicums/${practicumId}/assess`}
            className="inline-flex items-center gap-1.5 rounded-md bg-red px-3.5 py-2 font-mono text-xs font-semibold text-white shadow-sm hover:bg-red-deep transition-colors"
          >
            <span>+ Nilai Laporan Pertemuan Ini</span>
          </Link>
        </div>
      </div>

      {/* Grid: Navigasi 12 Pertemuan (Kiri) & Konten Modul (Kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Navigasi 12 Pertemuan */}
        <div className="lg:col-span-4 space-y-2">
          <div className="rounded-xl border border-line bg-card p-3 shadow-sm">
            <div className="px-3 py-2 border-b border-line flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-ink-soft font-semibold">
                Daftar 12 Pertemuan
              </span>
              <span className="font-mono text-[10px] bg-red/10 text-red px-1.5 py-0.5 rounded font-bold">
                OBE 2026
              </span>
            </div>

            <div className="mt-2 space-y-1 max-h-[640px] overflow-y-auto pr-1">
              {modules.map((m) => {
                const isSelected = m.meetingNumber === selectedMeeting;
                return (
                  <button
                    key={m.meetingNumber}
                    onClick={() => {
                      setSelectedMeeting(m.meetingNumber);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg transition-all flex items-start gap-2.5 border ${
                      isSelected
                        ? "bg-red/5 border-red/30 shadow-sm"
                        : "border-transparent hover:bg-paper/80 hover:border-line"
                    }`}
                  >
                    <span
                      className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-red text-white"
                          : "bg-paper border border-line text-ink-soft"
                      }`}
                    >
                      P{String(m.meetingNumber).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold leading-snug line-clamp-2 ${
                          isSelected ? "text-red" : "text-ink"
                        }`}
                      >
                        {m.topic}
                      </p>
                      <p className="text-[10px] text-ink-soft mt-0.5 line-clamp-1">
                        {m.summary}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Detail Modul Terpilih */}
        <div className="lg:col-span-8 space-y-4">
          {currentModule ? (
            <div className="rounded-xl border border-line bg-card p-5 sm:p-6 shadow-sm space-y-5">
              {/* Header Modul */}
              <div className="border-b border-line pb-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-xs font-bold bg-red text-white px-2 py-0.5 rounded">
                    PERTEMUAN {currentModule.meetingNumber}
                  </span>
                  <span className="font-mono text-xs border border-line bg-paper text-ink-soft px-2 py-0.5 rounded">
                    ⏱️ {currentModule.duration}
                  </span>
                  <span className="font-mono text-xs border border-line bg-paper text-ink-soft px-2 py-0.5 rounded">
                    📊 Pre-Test: {currentModule.weights.preTest}% | Praktik:{" "}
                    {currentModule.weights.practice}% | Post-Test:{" "}
                    {currentModule.weights.postTest}%
                  </span>
                </div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-ink tracking-tight">
                  {currentModule.topic}
                </h2>
                <p className="mt-1.5 text-xs text-ink-soft leading-relaxed">
                  {currentModule.summary}
                </p>
              </div>

              {/* Sub-Navigasi Tab Modul */}
              <div className="flex flex-wrap gap-1 border-b border-line pb-2">
                {[
                  { id: "teori", label: "📖 Landasan Teori", icon: "📖" },
                  { id: "langkah", label: "💻 Langkah Praktikum", icon: "💻" },
                  { id: "pretest", label: "❓ Soal Pre-Test", icon: "❓" },
                  { id: "posttest", label: "📝 Soal Post-Test", icon: "📝" },
                  { id: "rubrik", label: "🎯 Rubrik Penilaian AI", icon: "🎯" },
                  { id: "capaian", label: "🎯 Capaian (CPL & CPMK)", icon: "📋" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`px-3 py-1.5 font-mono text-xs font-semibold rounded-md transition-colors ${
                      activeTab === tab.id
                        ? "bg-red text-white shadow-sm"
                        : "text-ink-soft hover:bg-paper hover:text-ink"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Konten Tab */}
              <div className="pt-1">
                {activeTab === "teori" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-base font-bold text-ink">
                        Landasan Teori & Konsep Pendukung
                      </h3>
                      <span className="font-mono text-[11px] text-ink-soft">
                        Modul {currentModule.meetingNumber} • Petunjuk Praktikum Basis Data
                      </span>
                    </div>

                    <div className="rounded-lg border border-line bg-paper/50 p-4 text-xs text-ink leading-relaxed whitespace-pre-wrap font-sans max-h-[500px] overflow-y-auto">
                      {currentModule.coreTheory || "Tidak ada rincian teori tertulis."}
                    </div>

                    {currentModule.toolsAndEnvironment &&
                      currentModule.toolsAndEnvironment.length > 0 && (
                        <div className="rounded-lg border border-line bg-card p-3.5 space-y-1.5">
                          <h4 className="font-mono text-xs font-bold text-ink flex items-center gap-1.5">
                            <span>🛠️</span>
                            <span>Perangkat & Lingkungan yang Digunakan:</span>
                          </h4>
                          <ul className="list-disc list-inside text-xs text-ink-soft space-y-1 pl-1">
                            {currentModule.toolsAndEnvironment.map((tool, idx) => (
                              <li key={idx}>{tool}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                )}

                {activeTab === "langkah" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-base font-bold text-ink">
                        Instruksi & Langkah Kerja Praktikum (Hands-On)
                      </h3>
                      <span className="font-mono text-[11px] text-red font-semibold">
                        Bobot: {currentModule.weights.practice}%
                      </span>
                    </div>

                    <div className="rounded-lg border border-line bg-paper/50 p-4 text-xs text-ink leading-relaxed whitespace-pre-wrap font-sans max-h-[500px] overflow-y-auto">
                      {currentModule.labSteps ||
                        "Langkah praktikum sesuai buku petunjuk resmi."}
                    </div>
                  </div>
                )}

                {activeTab === "pretest" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-base font-bold text-ink">
                        Pertanyaan Pre-Test (Evaluasi Pemahaman Awal)
                      </h3>
                      <span className="font-mono text-[11px] text-red font-semibold">
                        Bobot: {currentModule.weights.preTest}% • Alokasi: 30 Menit
                      </span>
                    </div>

                    <div className="rounded-lg border border-line bg-paper/50 p-4 text-xs text-ink leading-relaxed whitespace-pre-wrap font-sans max-h-[500px] overflow-y-auto">
                      {currentModule.preTest ||
                        "Tidak ada pertanyaan pre-test spesifik untuk modul ini."}
                    </div>
                  </div>
                )}

                {activeTab === "posttest" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-base font-bold text-ink">
                        Tugas Post-Test & Laporan Resmi Praktikan
                      </h3>
                      <span className="font-mono text-[11px] text-red font-semibold">
                        Bobot: {currentModule.weights.postTest}% • Alokasi: 60 Menit
                      </span>
                    </div>

                    <div className="rounded-lg border border-line bg-paper/50 p-4 text-xs text-ink leading-relaxed whitespace-pre-wrap font-sans max-h-[500px] overflow-y-auto">
                      {currentModule.postTest ||
                        "Kerjakan tugas mandiri sesuai instruksi asisten di laboratorium."}
                    </div>
                  </div>
                )}

                {activeTab === "rubrik" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-base font-bold text-ink">
                        Rubrik Penilaian AI & Kriteria Evaluasi Laporan
                      </h3>
                      <span className="font-mono text-[11px] text-ink-soft">
                        Standar Skala Nilai 0 - 100
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-line bg-paper/50 p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-ink">
                            Kelengkapan Struktur
                          </span>
                          <span className="font-mono text-[10px] bg-red/10 text-red px-1.5 py-0.5 rounded font-semibold">
                            30%
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-soft leading-relaxed">
                          Identitas lengkap, dasar teori, langkah percobaan tertera runtut,
                          tangkapan layar hasil terbaca jelas, pembahasan terstruktur, dan
                          kesimpulan.
                        </p>
                      </div>

                      <div className="rounded-lg border border-line bg-paper/50 p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-ink">
                            Kebenaran Isi & Query
                          </span>
                          <span className="font-mono text-[10px] bg-red/10 text-red px-1.5 py-0.5 rounded font-semibold">
                            40%
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-soft leading-relaxed">
                          Sintaks SQL / MongoDB / Python benar tanpa sintaks error. Output
                          sesuai spesifikasi soal studi kasus dan data terisi konsisten.
                        </p>
                      </div>

                      <div className="rounded-lg border border-line bg-paper/50 p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-ink">
                            Kedalaman Analisis
                          </span>
                          <span className="font-mono text-[10px] bg-red/10 text-red px-1.5 py-0.5 rounded font-semibold">
                            30%
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-soft leading-relaxed">
                          Mampu menjelaskan alur kerja query, bukan sekadar menempel
                          screenshot. Jawaban post-test dianalisis secara mendalam dan ilmiah.
                        </p>
                      </div>
                    </div>

                    {currentModule.rubricPoints && currentModule.rubricPoints.length > 0 && (
                      <div className="rounded-lg border border-line bg-card p-4 space-y-2">
                        <h4 className="font-mono text-xs font-bold text-ink flex items-center gap-1.5">
                          <span>🎯</span>
                          <span>Fokus Penilaian Khusus Pertemuan {currentModule.meetingNumber}:</span>
                        </h4>
                        <ul className="space-y-1.5">
                          {currentModule.rubricPoints.map((point, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-ink-soft flex items-start gap-2"
                            >
                              <span className="text-red font-bold font-mono">✓</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "capaian" && (
                  <div className="space-y-4">
                    <h3 className="font-serif text-base font-bold text-ink">
                      Deskripsi Capaian Pembelajaran & Indikator
                    </h3>

                    <div className="space-y-3">
                      <div className="rounded-lg border border-line bg-paper/50 p-4 space-y-1.5">
                        <span className="font-mono text-xs font-bold text-ink uppercase tracking-wider">
                          Capaian Pembelajaran (CPL & CPMK)
                        </span>
                        <p className="text-xs text-ink-soft leading-relaxed whitespace-pre-wrap">
                          {currentModule.cplCpmk ||
                            "Mengaplikasikan konsep siklus hidup pengembangan sistem solusi berbasis komputasi."}
                        </p>
                      </div>

                      <div className="rounded-lg border border-line bg-paper/50 p-4 space-y-1.5">
                        <span className="font-mono text-xs font-bold text-ink uppercase tracking-wider">
                          Indikator Ketercapaian
                        </span>
                        <p className="text-xs text-ink-soft leading-relaxed whitespace-pre-wrap">
                          {currentModule.indicators ||
                            "Mahasiswa mampu mengimplementasikan rancangan dan operasi basis data sesuai studi kasus."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-card p-12 text-center text-ink-soft">
              Pilih pertemuan di panel kiri untuk melihat isi silabus modul.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
