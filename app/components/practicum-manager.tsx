"use client";

import { useState } from "react";
import StudentManager, { StudentItem } from "./student-manager";

export interface PracticumWithCount {
  id: string;
  name: string;
  slot: string;
  totalMeetings: number;
  createdAt: string;
  _count: {
    students: number;
    reports: number;
  };
}

interface PracticumManagerProps {
  initialPracticums: PracticumWithCount[];
}

export default function PracticumManager({ initialPracticums }: PracticumManagerProps) {
  const [practicums, setPracticums] = useState<PracticumWithCount[]>(initialPracticums);
  const [selectedPracticum, setSelectedPracticum] = useState<PracticumWithCount | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<StudentItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // State Form Buat Praktikum
  const [name, setName] = useState("");
  const [slot, setSlot] = useState("");
  const [totalMeetings, setTotalMeetings] = useState(8);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // State Hapus Praktikum
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreatePracticum = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!name.trim() || !slot.trim()) {
      setFormError("Nama praktikum dan slot wajib diisi.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/practicums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slot: slot.trim(),
          totalMeetings: Number(totalMeetings) || 8,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat praktikum.");
      }

      const newPracticum: PracticumWithCount = {
        ...data.practicum,
        _count: { students: 0, reports: 0 },
      };

      setPracticums([newPracticum, ...practicums]);
      setName("");
      setSlot("");
      setTotalMeetings(8);
      setFormSuccess(`Praktikum "${newPracticum.name}" berhasil dibuat.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setFormError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleOpenStudents = async (p: PracticumWithCount) => {
    setSelectedPracticum(p);
    setLoadingStudents(true);
    try {
      const res = await fetch(`/api/practicums/${p.id}/students`);
      const data = await res.json();
      if (data.students) {
        setSelectedStudents(data.students);
      }
    } catch {
      setSelectedStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleDeletePracticum = async (id: string, pName: string) => {
    if (!confirm(`Hapus praktikum "${pName}" beserta seluruh data praktikan di dalamnya?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/practicums/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus praktikum.");
      }

      setPracticums(practicums.filter((p) => p.id !== id));
      if (selectedPracticum?.id === id) {
        setSelectedPracticum(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus praktikum.";
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateStudentCount = (practicumId: string, newCount: number) => {
    setPracticums((prev) =>
      prev.map((p) =>
        p.id === practicumId
          ? { ...p, _count: { ...p._count, students: newCount } }
          : p
      )
    );
  };

  return (
    <div className="space-y-10">
      {/* Panel Kelola Praktikan Aktif (Jika dipilih) */}
      {selectedPracticum && (
        <div className="rounded-xl border-2 border-line bg-card p-6 shadow-[0_2px_4px_rgba(20,33,46,0.06)]">
          {loadingStudents ? (
            <div className="py-10 text-center text-xs font-mono text-ink-soft">
              Memuat data praktikan...
            </div>
          ) : (
            <StudentManager
              practicumId={selectedPracticum.id}
              practicumName={`${selectedPracticum.name} — ${selectedPracticum.slot}`}
              initialStudents={selectedStudents}
              onClose={() => setSelectedPracticum(null)}
              onUpdateCount={(count) => handleUpdateStudentCount(selectedPracticum.id, count)}
            />
          )}
        </div>
      )}

      {/* Form Buat Praktikum Baru */}
      <div className="rounded-lg border border-line bg-card p-6">
        <h2 className="font-serif text-xl font-semibold text-ink">Tambah Praktikum Baru</h2>
        <p className="mt-1 text-xs text-ink-soft">
          Definisikan mata kuliah praktikum, slot waktu/shift, serta jumlah pertemuan yang ditampung.
        </p>

        <form onSubmit={handleCreatePracticum} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1">
                Nama Praktikum / Mata Kuliah *
              </label>
              <input
                type="text"
                placeholder="cth. Praktikum Jaringan Komputer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:border-red focus:outline-none focus:ring-1 focus:ring-red"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1">
                Slot / Shift Waktu *
              </label>
              <input
                type="text"
                placeholder="cth. Slot A (Senin 08:00 - 10:30)"
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:border-red focus:outline-none focus:ring-1 focus:ring-red"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-soft mb-1">
                Kapasitas Pertemuan
              </label>
              <input
                type="number"
                min={1}
                max={32}
                value={totalMeetings}
                onChange={(e) => setTotalMeetings(Number(e.target.value))}
                className="w-full rounded-md border border-line px-3 py-2 font-mono text-sm text-ink focus:border-red focus:outline-none focus:ring-1 focus:ring-red"
              />
            </div>
          </div>

          {formError && (
            <div className="rounded-md border border-red/30 bg-[#FBECEA] p-3 text-xs text-red">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="rounded-md border border-green/30 bg-[#E6F4EC] p-3 text-xs text-[#1E7A46]">
              {formSuccess}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-ink px-4 py-2 font-mono text-xs uppercase tracking-wider text-white transition-colors hover:bg-red disabled:opacity-50"
            >
              {creating ? "Menyimpan..." : "Buat Praktikum"}
            </button>
          </div>
        </form>
      </div>

      {/* Daftar Praktikum */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-ink">Daftar Praktikum Aktif</h2>
          <span className="font-mono text-xs text-ink-soft">
            Total: {practicums.length} Praktikum
          </span>
        </div>

        {practicums.length === 0 ? (
          <div className="rounded-lg border border-line bg-card px-5 py-10 text-center">
            <p className="font-serif text-lg font-semibold text-ink">Belum ada praktikum</p>
            <p className="mt-1 text-sm text-ink-soft">
              Gunakan formulir di atas untuk membuat praktikum baru beserta slot jadwalnya.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {practicums.map((p) => {
              const isSelected = selectedPracticum?.id === p.id;
              return (
                <div
                  key={p.id}
                  className={`flex flex-col justify-between rounded-lg border p-5 transition-all bg-card ${
                    isSelected
                      ? "border-red ring-1 ring-red shadow-[0_2px_4px_rgba(192,57,43,0.12)]"
                      : "border-line hover:border-ink-soft"
                  }`}
                >
                  <div className="space-y-2">
                    <span className="inline-block rounded bg-hint px-2 py-0.5 font-mono text-[11px] font-semibold text-ink">
                      {p.slot}
                    </span>
                    <h3 className="font-serif text-lg font-semibold text-ink line-clamp-2">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-ink-soft pt-2">
                      <div>
                        📅 <b className="font-mono text-ink">{p.totalMeetings}</b> Pertemuan
                      </div>
                      <div>
                        👥 <b className="font-mono text-ink">{p._count.students}</b> Praktikan
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-line pt-3 text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenStudents(p)}
                      className="font-medium text-ink underline-offset-2 hover:text-red hover:underline"
                    >
                      {isSelected ? "Sedang Dikelola ↑" : "Kelola Praktikan →"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePracticum(p.id, p.name)}
                      disabled={deletingId === p.id}
                      className="font-mono text-[11px] text-red underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      {deletingId === p.id ? "Menghapus..." : "Hapus"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
