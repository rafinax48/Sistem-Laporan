"use client";

import { useState } from "react";
import Link from "next/link";
import AssessmentMatrix from "./assessment-matrix";
import UploadForm from "./upload-form";

export interface PracticumSummary {
  id: string;
  name: string;
  slot: string;
  totalMeetings: number;
}

interface MatrixApiResponse {
  practicum: {
    id: string;
    name: string;
    slot: string;
    totalMeetings: number;
  };
  students: Array<{
    id: string;
    name: string;
    nim: string;
    className: string;
  }>;
  matrix: Record<
    string,
    Record<
      number,
      {
        reportId: string;
        assessmentId: string | null;
        overallScore: number | null;
        fileName: string;
        topic: string | null;
        createdAt: string;
      }
    >
  >;
  topics: string[];
}

interface HomeMatrixViewProps {
  practicums: PracticumSummary[];
  referenceTopics: string[];
  initialMatrixData?: MatrixApiResponse | null;
}

export default function HomeMatrixView({
  practicums,
  referenceTopics,
  initialMatrixData = null,
}: HomeMatrixViewProps) {
  const [activeTab, setActiveTab] = useState<"matrix" | "quick">("matrix");
  const [selectedPracticumId, setSelectedPracticumId] = useState<string>(
    practicums[0]?.id || ""
  );
  const [matrixData, setMatrixData] = useState<MatrixApiResponse | null>(
    initialMatrixData
  );
  const [loading, setLoading] = useState(false);

  const handlePracticumChange = (id: string) => {
    setSelectedPracticumId(id);
    setLoading(true);
    fetch(`/api/practicums/${id}/matrix`)
      .then((res) => res.json())
      .then((data) => {
        if (data.practicum) {
          setMatrixData(data);
        }
      })
      .catch((err) => {
        console.error("Gagal memuat data matriks:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (practicums.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-card p-10 text-center space-y-4 shadow-[0_1px_3px_rgba(11,19,43,0.04)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEF3C7] text-uad-gold text-2xl">
          <span>📋</span>
        </div>
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-bold text-ink">
            Belum Ada Jadwal Praktikum
          </h2>
          <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
            Sistem penilaian berbasis <b>Buku Nilai (Matriks Pertemuan)</b> yang otomatis memetakan nilai per mahasiswa dan per minggu pertemuan.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/practicums"
            className="inline-flex rounded-lg bg-ink px-5 py-2.5 font-mono text-xs uppercase tracking-wider font-bold text-white hover:bg-red transition-all shadow-xs"
          >
            + Buat Jadwal Praktikum Baru
          </Link>
        </div>
      </div>
    );
  }

  const currentPracticum = practicums.find((p) => p.id === selectedPracticumId);

  return (
    <div className="space-y-6">
      {/* Tab Switcher & Selector Praktikum */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-line bg-card p-3 shadow-[0_1px_2px_rgba(11,19,43,0.04)]">
        {/* Tab Buttons */}
        <div className="inline-flex rounded-lg border border-line bg-hint p-1">
          <button
            type="button"
            onClick={() => setActiveTab("matrix")}
            className={`rounded-md px-3.5 py-1.5 font-mono text-xs font-bold transition-all ${
              activeTab === "matrix"
                ? "bg-white text-ink shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            📊 Buku Nilai (Matriks)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("quick")}
            className={`rounded-md px-3.5 py-1.5 font-mono text-xs font-bold transition-all ${
              activeTab === "quick"
                ? "bg-white text-ink shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            ⚡ Penilaian Cepat Mandiri
          </button>
        </div>

        {/* Dropdown Pemilihan Praktikum (Hanya saat tab matrix) */}
        {activeTab === "matrix" && (
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="font-mono text-xs uppercase tracking-wider text-ink-soft whitespace-nowrap font-semibold">
              Pilih Praktikum:
            </label>
            <select
              value={selectedPracticumId}
              onChange={(e) => handlePracticumChange(e.target.value)}
              className="rounded-lg border border-line bg-paper px-3 py-1.5 font-semibold text-xs text-ink focus:border-uad-gold focus:outline-none max-w-xs"
            >
              {practicums.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.slot}
                </option>
              ))}
            </select>
            {selectedPracticumId && (
              <Link
                href={`/practicums/${selectedPracticumId}`}
                className="rounded-lg bg-ink px-3 py-1.5 font-mono text-xs font-semibold text-white hover:bg-red transition-colors flex items-center gap-1 shadow-xs"
              >
                <span>Buka Halaman Khusus</span>
                <span>↗</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Konten Sesuai Tab */}
      {activeTab === "matrix" ? (
        loading ? (
          <div className="rounded-2xl border border-line bg-card py-24 text-center text-xs font-mono text-ink-soft space-y-3">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-ink border-t-transparent" />
            <p>Memuat lembar matriks nilai praktikum...</p>
          </div>
        ) : matrixData && currentPracticum ? (
          <AssessmentMatrix
            key={matrixData.practicum.id}
            practicumId={matrixData.practicum.id}
            practicumName={matrixData.practicum.name}
            practicumSlot={matrixData.practicum.slot}
            totalMeetings={matrixData.practicum.totalMeetings}
            students={matrixData.students || []}
            initialMatrix={matrixData.matrix || {}}
            referenceTopics={referenceTopics}
          />
        ) : null
      ) : (
        <UploadForm topics={referenceTopics} />
      )}
    </div>
  );
}
