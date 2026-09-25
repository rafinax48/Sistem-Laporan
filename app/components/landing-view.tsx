"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getUserProfile,
  saveUserProfile,
  clearUserProfile,
  maskApiKey,
  UserProfile,
} from "@/lib/user-profile";

interface LandingViewProps {
  totalPracticums?: number;
  totalStudents?: number;
  totalAssessments?: number;
}

export default function LandingView({
  totalPracticums = 0,
  totalStudents = 0,
  totalAssessments = 0,
}: LandingViewProps) {
  const router = useRouter();

  // State Profil
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // State Form Input
  const [name, setName] = useState("");
  const [nim, setNim] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [useDefaultKey, setUseDefaultKey] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // State Validasi & Notifikasi
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Baca profil yang tersimpan di browser
  useEffect(() => {
    const existing = getUserProfile();
    if (existing && existing.name && existing.nim) {
      setProfile(existing);
      setName(existing.name);
      setNim(existing.nim);
      setApiKey(existing.apiKey || "");
      if (!existing.apiKey) {
        setUseDefaultKey(true);
      }
    } else {
      setIsEditing(true);
    }
  }, []);

  // Handle Uji Koneksi API Key Gemini
  const handleTestKey = async () => {
    setTestResult(null);
    setFormError(null);

    const keyToTest = apiKey.trim();
    if (!keyToTest) {
      setFormError("Masukkan API Key Gemini terlebih dahulu untuk diuji.");
      return;
    }

    setTestingKey(true);
    try {
      const res = await fetch("/api/auth/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyToTest }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setTestResult({
          success: true,
          message: data.message || "API Key Gemini terverifikasi aktif & valid!",
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "API Key tidak valid atau kuota habis.",
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: "Gagal menghubungkan ke server validasi.",
      });
    } finally {
      setTestingKey(false);
    }
  };

  // Handle Simpan Profil & API Key
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const cleanName = name.trim();
    const cleanNim = nim.trim();
    const cleanKey = useDefaultKey ? "" : apiKey.trim();

    if (!cleanName) {
      setFormError("Nama lengkap wajib diisi.");
      return;
    }

    if (!cleanNim) {
      setFormError("NIM mahasiswa wajib diisi.");
      return;
    }

    if (cleanNim.length < 5) {
      setFormError("Format NIM tidak valid. Masukkan NIM yang lengkap.");
      return;
    }

    if (!useDefaultKey && !cleanKey) {
      setFormError(
        "Masukkan Gemini API Key Anda, atau centang opsi 'Gunakan Default Server Lab' jika belum memiliki kunci pribadi."
      );
      return;
    }

    const newProfile: UserProfile = {
      name: cleanName,
      nim: cleanNim,
      apiKey: cleanKey,
      role: "student",
    };

    saveUserProfile(newProfile);
    setProfile(newProfile);
    setIsEditing(false);
    setFormSuccess("Data identitas dan konfigurasi API Key berhasil disimpan!");

    // Arahkan ke dashboard buku nilai setelah delay singkat
    setTimeout(() => {
      router.push("/dashboard");
    }, 800);
  };

  // Handle Reset / Logout
  const handleReset = () => {
    if (confirm("Reset identitas dan API Key yang tersimpan di perangkat ini?")) {
      clearUserProfile();
      setProfile(null);
      setName("");
      setNim("");
      setApiKey("");
      setUseDefaultKey(false);
      setIsEditing(true);
      setTestResult(null);
      setFormError(null);
      setFormSuccess(null);
    }
  };

  return (
    <div className="space-y-16 pb-12">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-12 sm:pt-14 sm:pb-16 border-b border-line bg-gradient-to-b from-card/80 via-paper to-paper">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            
            {/* Kolom Kiri: Branding & Informasi Institusional */}
            <div className="lg:col-span-6 space-y-6">
              {/* Badge UAD */}
              <div className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs shadow-xs">
                <span className="flex h-2 w-2 rounded-full bg-uad-gold animate-pulse" />
                <span className="font-mono text-[11px] font-bold text-ink">
                  Universitas Ahmad Dahlan
                </span>
                <span className="text-line">|</span>
                <span className="font-mono text-[11px] text-ink-soft">
                  Lab Teknik Informatika
                </span>
              </div>

              {/* Judul Besar */}
              <div className="space-y-3">
                <h1 className="font-serif text-3xl font-extrabold tracking-tight text-ink sm:text-5xl sm:leading-[1.15]">
                  Sistem Asesmen &amp; Buku Nilai Laporan Praktikum
                </h1>
                <p className="text-base text-ink-soft leading-relaxed max-w-xl">
                  Portal evaluasi otomatis laporan praktikum mahasiswa menggunakan{" "}
                  <strong className="text-ink font-semibold">Gemini Multimodal Vision</strong>.
                  Menganalisis teks, tangkapan layar praktikum, serta kode program berstandar
                  rubrik mutu akademik UAD.
                </p>
              </div>

              {/* Metrik Cepat */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="rounded-xl border border-line bg-card p-3.5 shadow-xs">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                    Mata Kuliah
                  </span>
                  <span className="font-mono text-xl font-black text-ink">
                    {totalPracticums > 0 ? `${totalPracticums}+` : "Aktif"}
                  </span>
                  <span className="block text-[10px] text-ink-soft">Praktikum</span>
                </div>
                <div className="rounded-xl border border-line bg-card p-3.5 shadow-xs">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                    Praktikan
                  </span>
                  <span className="font-mono text-xl font-black text-ink">
                    {totalStudents > 0 ? `${totalStudents}` : "Terdata"}
                  </span>
                  <span className="block text-[10px] text-ink-soft">Mahasiswa</span>
                </div>
                <div className="rounded-xl border border-line bg-card p-3.5 shadow-xs">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                    Evaluasi AI
                  </span>
                  <span className="font-mono text-xl font-black text-ink">
                    {totalAssessments > 0 ? `${totalAssessments}+` : "Instan"}
                  </span>
                  <span className="block text-[10px] text-ink-soft">Buku Nilai</span>
                </div>
              </div>

              {/* Fitur Sorotan Kecil */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-ink-soft pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-green font-bold">✓</span> Rubrik 3 Kategori UAD
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-green font-bold">✓</span> Deteksi Baris &amp; Halaman
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-green font-bold">✓</span> Ekspor Resmi Excel
                </span>
              </div>
            </div>

            {/* Kolom Kanan: Card Input Identitas & API Key Gemini */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl border-2 border-line bg-card p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-sm">
                
                {/* Header Card */}
                <div className="flex items-start justify-between border-b border-line pb-4 mb-6">
                  <div>
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-red">
                      <span className="h-1.5 w-1.5 rounded-full bg-red" />
                      Portal Akses Mahasiswa &amp; Asisten
                    </span>
                    <h2 className="font-serif text-2xl font-bold text-ink mt-1">
                      {profile && !isEditing
                        ? "Profil Akses Aktif"
                        : "Konfigurasi Identitas & API Key"}
                    </h2>
                    <p className="text-xs text-ink-soft mt-0.5">
                      {profile && !isEditing
                        ? "Identitas Anda tersimpan di perangkat ini untuk seluruh asesmen praktikum."
                        : "Lengkapi data Anda agar hasil asesmen laporan terhubung dengan nama & akun Anda."}
                    </p>
                  </div>

                  {profile && !isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="rounded-md border border-line bg-hint px-2.5 py-1 text-xs font-mono text-ink hover:border-ink-soft transition-colors"
                    >
                      ✏️ Edit
                    </button>
                  )}
                </div>

                {/* VIEW MODE: Jika data profil sudah ada & tidak sedang diedit */}
                {profile && !isEditing ? (
                  <div className="space-y-6">
                    {/* Ringkasan Akun */}
                    <div className="rounded-xl border border-line bg-paper/60 p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-white font-mono text-base font-bold shadow-xs">
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-serif text-lg font-bold text-ink">
                            {profile.name}
                          </h3>
                          <p className="font-mono text-xs text-ink-soft">
                            NIM: <strong className="text-ink">{profile.nim}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-line text-xs font-mono">
                        <div>
                          <span className="block text-ink-soft text-[10px] uppercase">
                            Status Kunci Gemini AI:
                          </span>
                          {profile.apiKey ? (
                            <span className="inline-flex items-center gap-1.5 text-[#1E7A46] font-semibold mt-0.5">
                              <span className="h-2 w-2 rounded-full bg-green" />
                              Key Pribadi ({maskApiKey(profile.apiKey)})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-uad-gold font-semibold mt-0.5">
                              <span className="h-2 w-2 rounded-full bg-uad-gold" />
                              Default Server Lab
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="block text-ink-soft text-[10px] uppercase">
                            Perangkat:
                          </span>
                          <span className="text-ink font-semibold">Tersimpan di Browser</span>
                        </div>
                      </div>
                    </div>

                    {/* Tombol Aksi Utama */}
                    <div className="space-y-3">
                      <Link
                        href="/dashboard"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red px-5 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-red-deep transition-all hover:scale-[1.01]"
                      >
                        <span>Masuk ke Buku Nilai &amp; Jadwal Praktikum</span>
                        <span>→</span>
                      </Link>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="flex-1 rounded-lg border border-line bg-card py-2 text-center font-mono text-xs text-ink hover:border-ink-soft transition-colors"
                        >
                          Ganti Akun / API Key
                        </button>
                        <button
                          type="button"
                          onClick={handleReset}
                          className="rounded-lg border border-red/30 bg-red/5 px-3 py-2 text-center font-mono text-xs text-red hover:bg-red hover:text-white transition-colors"
                        >
                          Reset Profil
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* EDIT / INPUT FORM */
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    {/* Field 1: Nama Lengkap */}
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-ink font-semibold mb-1">
                        Nama Lengkap Mahasiswa / Asisten *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="cth. Muhammad Rafina Pratama"
                          className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-soft/70 focus:border-red focus:outline-none focus:ring-1 focus:ring-red"
                        />
                        <span className="absolute right-3 top-2.5 text-ink-soft">👤</span>
                      </div>
                    </div>

                    {/* Field 2: NIM */}
                    <div>
                      <label className="block font-mono text-xs uppercase tracking-wider text-ink font-semibold mb-1">
                        NIM (Nomor Induk Mahasiswa) *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={nim}
                          onChange={(e) => setNim(e.target.value)}
                          placeholder="cth. 2200018215"
                          className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 font-mono text-xs text-ink placeholder:text-ink-soft/70 focus:border-red focus:outline-none focus:ring-1 focus:ring-red"
                        />
                        <span className="absolute right-3 top-2.5 text-ink-soft">🆔</span>
                      </div>
                      <p className="mt-1 text-[11px] text-ink-soft">
                        NIM digunakan untuk mencocokkan baris mahasiswa di Buku Nilai Matriks.
                      </p>
                    </div>

                    {/* Field 3: Gemini API Key */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="block font-mono text-xs uppercase tracking-wider text-ink font-semibold">
                          Google Gemini API Key
                        </label>
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[11px] text-red font-semibold hover:underline flex items-center gap-1"
                        >
                          <span>Dapatkan Key Gratis</span>
                          <span>↗</span>
                        </a>
                      </div>

                      <div className="relative">
                        <input
                          type={showKey ? "text" : "password"}
                          disabled={useDefaultKey}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder={
                            useDefaultKey
                              ? "Menggunakan Default Server Lab"
                              : "AIzaSy..."
                          }
                          className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 pr-20 font-mono text-xs text-ink placeholder:text-ink-soft/70 focus:border-red focus:outline-none focus:ring-1 focus:ring-red disabled:opacity-50"
                        />
                        <div className="absolute right-2 top-1.5 flex items-center gap-1">
                          {!useDefaultKey && (
                            <button
                              type="button"
                              onClick={() => setShowKey(!showKey)}
                              className="rounded px-2 py-1 text-xs text-ink-soft hover:text-ink"
                              title={showKey ? "Sembunyikan" : "Tampilkan"}
                            >
                              {showKey ? "👁️‍🗨️" : "👁️"}
                            </button>
                          )}
                          {!useDefaultKey && (
                            <button
                              type="button"
                              disabled={testingKey || !apiKey.trim()}
                              onClick={handleTestKey}
                              className="rounded bg-hint px-2 py-1 font-mono text-[10px] font-bold text-ink hover:bg-line transition-colors disabled:opacity-40"
                              title="Uji koneksi API key"
                            >
                              {testingKey ? "Menguji..." : "Uji"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Checkbox Default Server */}
                      <label className="flex items-center gap-2 pt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useDefaultKey}
                          onChange={(e) => {
                            setUseDefaultKey(e.target.checked);
                            if (e.target.checked) setTestResult(null);
                          }}
                          className="h-3.5 w-3.5 rounded border-line text-red focus:ring-red"
                        />
                        <span className="text-[11px] text-ink-soft">
                          Gunakan konfigurasi default server lab (tanpa API key pribadi)
                        </span>
                      </label>
                    </div>

                    {/* Hasil Uji Key */}
                    {testResult && (
                      <div
                        className={`rounded-lg border p-3 text-xs flex items-start gap-2 ${
                          testResult.success
                            ? "border-green/30 bg-[#E6F4EC] text-[#1E7A46]"
                            : "border-red/30 bg-[#FBECEA] text-red"
                        }`}
                      >
                        <span>{testResult.success ? "✅" : "⚠️"}</span>
                        <div className="flex-1 font-mono text-[11px] leading-relaxed">
                          {testResult.message}
                        </div>
                      </div>
                    )}

                    {/* Notifikasi Form Error / Success */}
                    {formError && (
                      <div className="rounded-lg border border-red/30 bg-[#FBECEA] p-3 text-xs text-red font-medium">
                        ⚠️ {formError}
                      </div>
                    )}

                    {formSuccess && (
                      <div className="rounded-lg border border-green/30 bg-[#E6F4EC] p-3 text-xs text-[#1E7A46] font-medium">
                        ✅ {formSuccess}
                      </div>
                    )}

                    {/* Tombol Simpan & Batalkan */}
                    <div className="pt-2 space-y-2">
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-red py-3 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-red-deep transition-all"
                      >
                        Simpan &amp; Lanjut ke Dashboard →
                      </button>

                      {profile && (
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="w-full rounded-lg border border-line bg-card py-2 text-center font-mono text-xs text-ink hover:border-ink-soft transition-colors"
                        >
                          Batal Ubah
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {/* Footer Keamanan Data */}
                <div className="mt-5 border-t border-line pt-3 flex items-center justify-between text-[10px] font-mono text-ink-soft">
                  <span className="flex items-center gap-1">
                    🔒 Data &amp; Kunci tersimpan lokal di peramban Anda
                  </span>
                  <span>UAD Lab v2.5</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4 FITUR UTAMA SISTEM */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
          <span className="font-mono text-xs uppercase tracking-wider text-red font-semibold">
            Pilar Keunggulan Sistem
          </span>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-ink">
            Standar Penilaian Akademik Terpadu
          </h2>
          <p className="text-xs text-ink-soft leading-relaxed">
            Dirancang khusus untuk mendukung operasional praktikum di lingkungan Laboratorium Teknik Informatika UAD dengan akurasi penilaian tinggi.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1 */}
          <div className="rounded-2xl border border-line bg-card p-6 shadow-xs hover:border-ink-soft transition-all space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FEF3C7] text-xl">
              📊
            </div>
            <h3 className="font-serif text-lg font-bold text-ink">
              Buku Nilai Matriks Ala Excel
            </h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Tabel rekapitulasi nilai mahasiswa per minggu pertemuan (P01–Pn). Mendukung filter kelas, status perbaikan, dan ekspor instan format resmi Excel (.xlsx).
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-line bg-card p-6 shadow-xs hover:border-ink-soft transition-all space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E0E7FF] text-xl">
              👁️
            </div>
            <h3 className="font-serif text-lg font-bold text-ink">
              Multimodal Vision AI
            </h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Membedah dokumen PDF secara utuh, membaca teks bernomor baris serta merender halaman menjadi visual untuk memverifikasi keaslian tangkapan layar praktikum.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-line bg-card p-6 shadow-xs hover:border-ink-soft transition-all space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FEE2E2] text-xl">
              📍
            </div>
            <h3 className="font-serif text-lg font-bold text-ink">
              Deteksi Baris &amp; Halaman
            </h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Menghilangkan keraguan dengan rincian letak halaman, bab, perkiraan baris dokumen, serta kutipan teks yang memuat kesalahan atau kekurangan materi.
            </p>
          </div>

          {/* Card 4 */}
          <div className="rounded-2xl border border-line bg-card p-6 shadow-xs hover:border-ink-soft transition-all space-y-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DCFCE7] text-xl">
              ⚖️
            </div>
            <h3 className="font-serif text-lg font-bold text-ink">
              Rubrik Baku UAD
            </h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Penilaian terukur berbasis 3 kategori utama: <b>Kelengkapan Struktur</b>, <b>Kebenaran Isi</b>, dan <b>Kedalaman Analisis</b> dengan skala 0–100 &amp; skor band.
            </p>
          </div>
        </div>
      </section>

      {/* PANDUAN CARA MEMULAI */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div className="rounded-2xl border border-line bg-card p-8 sm:p-10 shadow-xs">
          <div className="max-w-2xl space-y-2 mb-8">
            <span className="font-mono text-xs uppercase tracking-wider text-red font-semibold">
              Alur Penggunaan
            </span>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              3 Langkah Praktis Melakukan Asesmen
            </h2>
            <p className="text-xs text-ink-soft">
              Panduan ringkas bagi asisten dan mahasiswa untuk menilai laporan praktikum:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="space-y-2 rounded-xl border border-line bg-paper/50 p-5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ink font-mono text-xs font-bold text-white">
                1
              </span>
              <h4 className="font-serif text-base font-bold text-ink">
                Lengkapi Identitas &amp; Key
              </h4>
              <p className="text-xs text-ink-soft leading-relaxed">
                Ketikkan Nama, NIM Anda pada form di atas, dan masukkan API Key Gemini dari Google AI Studio.
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-line bg-paper/50 p-5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ink font-mono text-xs font-bold text-white">
                2
              </span>
              <h4 className="font-serif text-base font-bold text-ink">
                Pilih Jadwal &amp; Pertemuan
              </h4>
              <p className="text-xs text-ink-soft leading-relaxed">
                Buka menu <b>Jadwal &amp; Praktikan</b> atau masuk ke halaman khusus praktikum Anda untuk memilih nomor sesi pertemuan (P01–Pn).
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-line bg-paper/50 p-5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ink font-mono text-xs font-bold text-white">
                3
              </span>
              <h4 className="font-serif text-base font-bold text-ink">
                Unggah &amp; Periksa Nilai
              </h4>
              <p className="text-xs text-ink-soft leading-relaxed">
                Unggah berkas laporan PDF mahasiswa. AI akan memberikan skor rubrik lengkap dengan temuan baris dan otomatis mencatat ke Buku Nilai.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PANDUAN MENDAPATKAN API KEY GEMINI */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div className="rounded-2xl border border-uad-gold/30 bg-[#FEF3C7]/20 p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <span className="font-mono text-xs uppercase tracking-wider text-uad-gold font-bold">
                💡 Panduan Google AI Studio
              </span>
              <h3 className="font-serif text-xl font-bold text-ink">
                Belum Memiliki Gemini API Key?
              </h3>
              <p className="text-xs text-ink-soft max-w-2xl leading-relaxed">
                Anda dapat membuat kunci API Gemini secara <b>gratis</b> tanpa kartu kredit menggunakan akun Google (email UAD atau Gmail) dalam 1 menit.
              </p>
            </div>

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="self-start sm:self-auto inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white hover:bg-red transition-colors shadow-xs"
            >
              <span>Buka Google AI Studio</span>
              <span>↗</span>
            </a>
          </div>

          <ol className="list-decimal list-inside text-xs text-ink-soft space-y-1 pt-2 font-mono">
            <li>Kunjungi portal resmi <strong className="text-ink">aistudio.google.com</strong> dan login dengan akun Google.</li>
            <li>Klik tombol biru <strong>&quot;Get API key&quot;</strong> atau <strong>&quot;Create API key&quot;</strong>.</li>
            <li>Pilih project baru (atau buat baru) lalu salin kunci yang diawali dengan <code className="bg-card px-1.5 py-0.5 rounded border border-line text-red font-bold">AIzaSy...</code>.</li>
            <li>Tempelkan ke formulir di atas dan klik <strong>&quot;Uji&quot;</strong> untuk memastikan koneksi berhasil.</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
