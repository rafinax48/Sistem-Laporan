"use client";

import { useState } from "react";
import Link from "next/link";
import AssessmentMatrix from "./assessment-matrix";

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
      <div className="rounded-xl border border-line bg-card p-10 text-center space-y-4 shadow-[0_1px_3px_rgba(20,33,46,0.04)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-hint">
          <span className="text-xl">📋</span>
        </div>
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-semibold text-ink">
            Belum Ada Jadwal Praktikum
          </h2>
          <p className="text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
            Sistem penilaian saat ini menggunakan <b>Buku Nilai (Matriks Pertemuan)</b> yang terikat langsung dengan jadwal praktikum dan data mahasiswa.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/practicums"
            className="inline-flex rounded-md bg-ink px-4 py-2 font-mono text-xs uppercase tracking-wider text-white hover:bg-red transition-colors"
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
      {/* Selector Praktikum */}
      <div className="rounded-lg border border-line bg-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-[0_1px_2px_rgba(20,33,46,0.04)]">
        <div className="flex items-center gap-3">
          <label className="font-mono text-xs uppercase tracking-wider text-ink-soft whitespace-nowrap">
            Pilih Praktikum:
          </label>
          <select
            value={selectedPracticumId}
            onChange={(e) => handlePracticumChange(e.target.value)}
            className="rounded-md border border-line bg-card px-3 py-1.5 font-medium text-xs text-ink focus:border-red focus:outline-none"
          >
            {practicums.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.slot}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/practicums"
            className="font-medium text-ink underline-offset-2 hover:text-red hover:underline"
          >
            + Kelola Jadwal & Praktikan →
          </Link>
        </div>
      </div>

      {/* Tampilan Matriks Nilai Ala Excel */}
      {loading ? (
        <div className="rounded-xl border border-line bg-card py-20 text-center text-xs font-mono text-ink-soft space-y-2">
          <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-ink border-t-transparent" />
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
      ) : null}
    </div>
  );
}
