"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SettingsViewProps {
  practicum: {
    id: string;
    name: string;
    slot: string;
    totalMeetings: number;
    _count: {
      students: number;
      reports: number;
    };
  };
}

export default function SettingsView({ practicum }: SettingsViewProps) {
  const router = useRouter();

  // State Form Edit
  const [name, setName] = useState(practicum.name);
  const [slot, setSlot] = useState(practicum.slot);
  const [totalMeetings, setTotalMeetings] = useState(practicum.totalMeetings);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // State Danger Zone: Hapus Praktikum
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // State Hapus Seluruh Praktikan
  const [clearingStudents, setClearingStudents] = useState(false);
  const [studentsCount, setStudentsCount] = useState(practicum._count.students);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);

    if (!name.trim() || !slot.trim()) {
      setSaveError("Nama praktikum dan slot waktu wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/practicums/${practicum.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slot: slot.trim(),
          totalMeetings: Number(totalMeetings) || 8,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui praktikum.");
      }

      setSaveSuccess("Pengaturan praktikum berhasil disimpan.");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleClearAllStudents = async () => {
    if (studentsCount === 0) return;
    const confirmPrompt = confirm(
      `PERHATIAN: Apakah Anda yakin ingin menghapus SELURUH (${studentsCount}) data praktikan dari praktikum ini?\n\nSeluruh data praktikan dan berkas laporannya akan dihapus permanen.`
    );
    if (!confirmPrompt) return;

    setClearingStudents(true);
    try {
      const res = await fetch(`/api/practicums/${practicum.id}/students`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus praktikan.");
      }

      setStudentsCount(0);
      alert(data.message || "Seluruh data praktikan berhasil dihapus.");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus data praktikan.";
      alert(msg);
    } finally {
      setClearingStudents(false);
    }
  };

  const handleDeletePracticum = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);

    if (deleteConfirmInput.trim() !== practicum.name.trim()) {
      setDeleteError(`Teks konfirmasi harus persis sama dengan "${practicum.name}".`);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/practicums/${practicum.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menghapus praktikum.");
      }

      // Redirect ke halaman daftar praktikum
      router.push("/practicums");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus.";
      setDeleteError(msg);
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-10 max-w-4xl">
      {/* Form Pengaturan Data Praktikum */}
      <div className="rounded-xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(20,33,46,0.04)] space-y-6">
        <div>
          <h3 className="font-serif text-xl font-bold text-ink">
            Informasi & Konfigurasi Praktikum
          </h3>
          <p className="text-xs text-ink-soft mt-1">
            Ubah nama mata kuliah praktikum, slot waktu / shift asisten, dan kapasitas pertemuan.
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block font-mono text-xs uppercase tracking-wider text-ink-soft mb-1">
                Nama Mata Kuliah / Praktikum *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-red focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-ink-soft mb-1">
                Kapasitas Sesi Pertemuan
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={totalMeetings}
                onChange={(e) => setTotalMeetings(Number(e.target.value))}
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm font-mono text-ink focus:border-red focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block font-mono text-xs uppercase tracking-wider text-ink-soft mb-1">
                Slot Waktu / Shift Asisten *
              </label>
              <input
                type="text"
                required
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                placeholder="Contoh: Slot A (Senin 08:00 - 10:30 WIB)"
                className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-red focus:outline-none"
              />
            </div>
          </div>

          {saveError && (
            <div className="rounded-md border border-red/30 bg-[#FBECEA] p-3 text-xs text-red">
              {saveError}
            </div>
          )}

          {saveSuccess && (
            <div className="rounded-md border border-green/30 bg-[#E6F4EC] p-3 text-xs text-[#1E7A46]">
              {saveSuccess}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-line">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-ink px-5 py-2 font-mono text-xs uppercase tracking-wider text-white hover:bg-red transition-colors disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>

      {/* Zona Bahaya (Danger Zone) */}
      <div className="rounded-xl border-2 border-red/40 bg-card p-6 shadow-[0_1px_2px_rgba(20,33,46,0.04)] space-y-6">
        <div className="border-b border-line pb-3">
          <span className="rounded bg-red/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-red">
            Zona Bahaya (Danger Zone)
          </span>
          <h3 className="font-serif text-xl font-bold text-red mt-2">
            Tindakan Penghapusan Permanen
          </h3>
          <p className="text-xs text-ink-soft mt-1">
            Operasi di bagian ini bersifat destruktif dan data yang terhapus tidak dapat dipulihkan kembali.
          </p>
        </div>

        {/* 1. Hapus Semua Data Praktikan */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
          <div>
            <h4 className="font-semibold text-ink text-sm">
              Kosongkan / Hapus Seluruh Data Mahasiswa
            </h4>
            <p className="text-xs text-ink-soft mt-0.5">
              Menghapus semua ({studentsCount}) mahasiswa praktikan dari jadwal ini tanpa menghapus kelas praktikum.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearAllStudents}
            disabled={clearingStudents || studentsCount === 0}
            className="self-start sm:self-auto rounded-md border border-red bg-white px-4 py-2 font-mono text-xs font-semibold text-red hover:bg-red hover:text-white transition-colors disabled:opacity-40"
          >
            {clearingStudents ? "Menghapus..." : "Hapus Semua Mahasiswa"}
          </button>
        </div>

        {/* 2. Hapus Praktikum Permanen */}
        <div className="space-y-4 pt-2">
          <div>
            <h4 className="font-semibold text-red text-sm">
              Hapus Praktikum & Seluruh Isinya Secara Permanen
            </h4>
            <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">
              Tindakan ini akan menghapus mata kuliah praktikum <b>&quot;{practicum.name}&quot;</b> beserta <b>{studentsCount} praktikan</b> dan <b>{practicum._count.reports} laporan evaluasi nilai</b> yang terkait.
            </p>
          </div>

          <form onSubmit={handleDeletePracticum} className="space-y-3 rounded-lg border border-red/20 bg-red/5 p-4">
            <label className="block text-xs text-ink">
              Untuk mengonfirmasi, ketikkan nama praktikum{" "}
              <b className="font-mono text-red">&quot;{practicum.name}&quot;</b> di bawah ini:
            </label>
            <input
              type="text"
              required
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder={practicum.name}
              className="w-full rounded-md border border-red/40 bg-white px-3 py-2 text-xs text-ink focus:border-red focus:outline-none"
            />

            {deleteError && (
              <p className="text-xs text-red font-medium">{deleteError}</p>
            )}

            <button
              type="submit"
              disabled={deleting || deleteConfirmInput.trim() !== practicum.name.trim()}
              className="rounded-md bg-red px-4 py-2 font-mono text-xs uppercase tracking-wider text-white hover:bg-red-deep transition-colors disabled:opacity-40"
            >
              {deleting ? "Menghapus Praktikum..." : "Saya Paham, Hapus Praktikum Ini Permanen"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
