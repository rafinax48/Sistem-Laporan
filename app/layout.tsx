import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Source_Sans_3 } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const source = Source_Sans_3({
  variable: "--font-source",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistem Laporan Praktikum · Universitas Ahmad Dahlan",
  description:
    "Portal Asisten Praktikum Laboratorium Informatika UAD — Evaluasi Multimodal Laporan Mahasiswa & Buku Nilai Perkuliahan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${fraunces.variable} ${source.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink selection:bg-amber/20">
        {/* Header Resmi Laboratorium UAD */}
        <header className="sticky top-0 z-40 border-b border-line bg-card/90 backdrop-blur-md shadow-[0_1px_2px_rgba(11,19,43,0.03)]">
          <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-white shadow-xs group-hover:bg-red transition-colors">
                <span className="font-mono text-xs font-bold tracking-tighter">UAD</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-base font-semibold tracking-tight text-ink">
                    Sistem Buku Nilai Praktikum
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 font-mono text-[10px] font-bold text-[#B45309]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D97706] animate-pulse" />
                    Lab Informatika
                  </span>
                </div>
                <span className="font-mono text-[10px] text-ink-soft">
                  Universitas Ahmad Dahlan · Evaluasi Laporan Multimodal
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-1 font-mono text-xs">
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 text-ink font-medium transition-all hover:bg-hint hover:text-ink"
              >
                Buku Nilai
              </Link>
              <Link
                href="/practicums"
                className="rounded-md px-3 py-1.5 text-ink-soft font-medium transition-all hover:bg-hint hover:text-ink"
              >
                Jadwal &amp; Praktikan
              </Link>
              <Link
                href="/history"
                className="rounded-md px-3 py-1.5 text-ink-soft font-medium transition-all hover:bg-hint hover:text-ink"
              >
                Riwayat Evaluasi
              </Link>
              <Link
                href="/reference"
                className="rounded-md px-3 py-1.5 text-ink-soft font-medium transition-all hover:bg-hint hover:text-ink"
              >
                Dokumen Referensi
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-line bg-card mt-16">
          <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-2 px-4 py-5 sm:flex-row sm:items-center sm:justify-between text-xs text-ink-soft sm:px-6">
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="h-2 w-2 rounded-full bg-green" />
              <span>Sistem Penilaian Multimodal · Standar Mutu Akademik UAD</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span>Rubrik: Kelengkapan, Kebenaran, Kedalaman</span>
              <span className="text-line">|</span>
              <span className="text-ink font-bold">Skala 0–100</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
