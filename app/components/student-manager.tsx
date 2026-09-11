"use client";

import { useState, useRef } from "react";

export interface StudentItem {
  id: string;
  name: string;
  nim: string;
  className: string;
  createdAt: string;
}

interface StudentManagerProps {
  practicumId: string;
  practicumName: string;
  initialStudents: StudentItem[];
  onUpdateCount?: (newCount: number) => void;
  onClose?: () => void;
}

export default function StudentManager({
  practicumId,
  practicumName,
  initialStudents,
  onUpdateCount,
  onClose,
}: StudentManagerProps) {
  const [students, setStudents] = useState<StudentItem[]>(initialStudents);
  const [activeTab, setActiveTab] = useState<"manual" | "file">("manual");
  const [search, setSearch] = useState("");

  // State Form Manual (hanya Nama, NIM, dan Kelas)
  const [manualName, setManualName] = useState("");
  const [manualNim, setManualNim] = useState("");
  const [manualClass, setManualClass] = useState("");
  const [submittingManual, setSubmittingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);

  // State Form File
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileSuccess, setFileSuccess] = useState<string | null>(null);
  const [detectedCols, setDetectedCols] = useState<{
    nameCol?: string;
    nimCol?: string;
    classCol?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Hapus Praktikan
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Handle Tambah Manual
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    setManualSuccess(null);

    if (!manualName.trim() || !manualNim.trim() || !manualClass.trim()) {
      setManualError("Nama, NIM, dan Kelas wajib diisi seluruhnya.");
      return;
    }

    setSubmittingManual(true);
    try {
      const res = await fetch(`/api/practicums/${practicumId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: manualName.trim(),
          nim: manualNim.trim(),
          className: manualClass.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menambahkan praktikan.");
      }

      const newStudent: StudentItem = {
        ...data.student,
        createdAt: data.student.createdAt || new Date().toISOString(),
      };

      const updated = [newStudent, ...students];
      setStudents(updated);
      onUpdateCount?.(updated.length);

      setManualName("");
      setManualNim("");
      setManualClass("");
      setManualSuccess(`Praktikan "${newStudent.name}" berhasil ditambahkan.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setManualError(msg);
    } finally {
      setSubmittingManual(false);
    }
  };

  // Handle Upload Berkas (Excel, CSV, SVG)
  const handleFileUpload = async (file: File) => {
    setFileError(null);
    setFileSuccess(null);
    setDetectedCols(null);
    setUploadingFile(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/practicums/${practicumId}/students`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengimpor file.");
      }

      setDetectedCols(data.columnsDetected);
      setFileSuccess(data.message || `Berhasil mengimpor ${data.count} praktikan.`);

      // Muat ulang daftar praktikan dari server
      const refreshRes = await fetch(`/api/practicums/${practicumId}/students`);
      const refreshData = await refreshRes.json();
      if (refreshData.students) {
        setStudents(refreshData.students);
        onUpdateCount?.(refreshData.students.length);
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memproses file.";
      setFileError(msg);
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle Hapus Praktikan
  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Hapus data praktikan ini?")) return;
    setDeletingId(studentId);
    try {
      const res = await fetch(`/api/practicums/${practicumId}/students/${studentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus praktikan.");
      }

      const updated = students.filter((s) => s.id !== studentId);
      setStudents(updated);
      onUpdateCount?.(updated.length);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus.";
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter pencarian tabel
  const filteredStudents = students.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.nim.toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col gap-2 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-red">Kelola Praktikan</span>
          <h2 className="font-serif text-2xl font-semibold text-ink">{practicumName}</h2>
          <p className="text-xs text-ink-soft">
            Total Praktikan Terdaftar: <b className="font-mono text-ink">{students.length}</b> orang
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="self-start rounded-md border border-line bg-hint px-3 py-1.5 text-xs font-medium text-ink hover:border-ink-soft"
          >
            Tutup Panel
          </button>
        )}
      </div>

      {/* Navigasi Tab Tambah Praktikan */}
      <div className="flex border-b border-line gap-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          className={`border-b-2 px-4 py-2 font-medium transition-colors ${
            activeTab === "manual"
              ? "border-ink text-ink font-semibold"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          ➕ Input Manual (Nama, NIM, Kelas)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("file")}
          className={`border-b-2 px-4 py-2 font-medium transition-colors ${
            activeTab === "file"
              ? "border-ink text-ink font-semibold"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          📁 Import File (Excel, CSV, SVG)
        </button>
      </div>

      {/* Tab Konten: Tambah Manual */}
      {activeTab === "manual" && (
        <form onSubmit={handleManualSubmit} className="rounded-lg border border-line bg-card p-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1">
                Nama Praktikan *
              </label>
              <input
                type="text"
                placeholder="cth. Rafi Satya Prayoga"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:border-red focus:outline-none focus:ring-1 focus:ring-red"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1">
                NIM *
              </label>
              <input
                type="text"
                placeholder="cth. 1301210048"
                value={manualNim}
                onChange={(e) => setManualNim(e.target.value)}
                className="w-full rounded-md border border-line px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-soft focus:border-red focus:outline-none focus:ring-1 focus:ring-red"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1">
                Kelas * (1 Huruf Alfabet: A, B, C, dst.)
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="cth. A"
                value={manualClass}
                onChange={(e) => setManualClass(e.target.value.toUpperCase())}
                className="w-full rounded-md border border-line px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-soft focus:border-red focus:outline-none focus:ring-1 focus:ring-red"
              />
              <span className="mt-1 block text-[10px] text-ink-soft">
                Hanya 1 karakter alfabet (otomatis kapital).
              </span>
            </div>
          </div>

          {manualError && (
            <div className="rounded-md border border-red/30 bg-[#FBECEA] p-3 text-xs text-red">
              {manualError}
            </div>
          )}

          {manualSuccess && (
            <div className="rounded-md border border-green/30 bg-[#E6F4EC] p-3 text-xs text-[#1E7A46]">
              {manualSuccess}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submittingManual}
              className="rounded-md bg-ink px-4 py-2 font-mono text-xs uppercase tracking-wider text-white transition-colors hover:bg-red disabled:opacity-50"
            >
              {submittingManual ? "Menyimpan..." : "Simpan Praktikan"}
            </button>
          </div>
        </form>
      )}

      {/* Tab Konten: Upload Berkas dengan Validator */}
      {activeTab === "file" && (
        <div className="rounded-lg border border-line bg-card p-5 space-y-4">
          <div className="rounded-md border border-line bg-hint/50 p-3.5 text-xs text-ink-soft space-y-2">
            <p className="font-semibold text-ink">📋 Aturan Validator & Format Berkas Praktikan:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Mendukung berkas <b>Excel (.xlsx, .xls)</b>, <b>CSV (.csv)</b>, dan <b>SVG (.svg)</b>.</li>
              <li>Wajib ada kolom yang mengandung kata <b>&ldquo;nama&rdquo;</b> (tiap awal kata otomatis kapital).</li>
              <li>Wajib ada kolom yang mengandung kata <b>&ldquo;nim&rdquo;</b>.</li>
              <li>
                Wajib ada kolom yang mengandung kata <b>&ldquo;kelas&rdquo;</b> (harus memiliki <b>1 karakter alfabet</b> saja, misal <code>A</code>, <code>B</code>, <code>C</code>; jika huruf kecil otomatis diubah menjadi huruf kapital).
              </li>
            </ul>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-card py-8 px-4 text-center transition-colors hover:border-red hover:bg-[#FBECEA]/20"
          >
            <svg
              className="mb-2 h-8 w-8 text-ink-soft"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm font-medium text-ink">
              {uploadingFile ? "Sedang memproses & memvalidasi file..." : "Klik untuk memilih berkas atau seret ke sini"}
            </p>
            <p className="mt-1 text-xs text-ink-soft">Mendukung format .xlsx, .xls, .csv, dan .svg</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.svg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </div>

          {fileError && (
            <div className="rounded-md border border-red/40 bg-[#FBECEA] p-3 text-xs text-red">
              <p className="font-bold">❌ Gagal Validasi Kolom:</p>
              <p className="mt-1 leading-relaxed">{fileError}</p>
            </div>
          )}

          {fileSuccess && (
            <div className="rounded-md border border-green/30 bg-[#E6F4EC] p-3 text-xs text-[#1E7A46] space-y-1">
              <p className="font-bold">✅ {fileSuccess}</p>
              {detectedCols && (
                <p className="font-mono text-[11px] opacity-90">
                  Kolom Terdeteksi: [Nama: &quot;{detectedCols.nameCol}&quot;, NIM: &quot;{detectedCols.nimCol}&quot;, Kelas: &quot;{detectedCols.classCol}&quot;]
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabel Daftar Praktikan */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-serif text-lg font-semibold text-ink">Daftar Praktikan Terdaftar</h3>
          <input
            type="text"
            placeholder="Filter nama, NIM, kelas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-60 rounded-md border border-line bg-card px-3 py-1.5 text-xs text-ink placeholder:text-ink-soft focus:border-red focus:outline-none"
          />
        </div>

        {filteredStudents.length === 0 ? (
          <div className="rounded-lg border border-line bg-card px-5 py-8 text-center text-xs text-ink-soft">
            {search ? "Tidak ada praktikan yang cocok dengan pencarian." : "Belum ada praktikan terdaftar pada praktikum ini."}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-line bg-card shadow-[0_1px_2px_rgba(20,33,46,0.04)]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-hint/40 text-ink-soft font-mono uppercase tracking-wider">
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">NIM</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((st, idx) => (
                  <tr key={st.id} className="border-b border-line last:border-0 hover:bg-hint/50">
                    <td className="px-4 py-2.5 font-mono text-ink-soft">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-ink">{st.name}</td>
                    <td className="px-4 py-2.5 font-mono text-ink-soft">{st.nim}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded bg-hint px-2 py-0.5 font-mono text-[11px] text-ink font-semibold">
                        {st.className}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(st.id)}
                        disabled={deletingId === st.id}
                        className="font-mono text-[11px] text-red underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        {deletingId === st.id ? "Menghapus..." : "Hapus"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
