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
  title: "Sistem Penilaian Laporan Praktikum",
  description:
    "Tool asisten praktikum untuk menilai laporan mahasiswa dengan pembanding laporan referensi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${fraunces.variable} ${source.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line bg-card">
          <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="font-serif text-lg font-semibold tracking-tight text-ink">
                Sistem Penilaian
              </span>
              <span className="hidden font-mono text-xs text-ink-soft sm:inline">
                laporan praktikum
              </span>
            </Link>
            <nav className="flex items-center gap-1 font-mono text-xs">
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 text-ink-soft transition-colors hover:text-red"
              >
                Beri Nilai
              </Link>
              <Link
                href="/reference"
                className="rounded-md px-3 py-1.5 text-ink-soft transition-colors hover:text-red"
              >
                Referensi
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line bg-card">
          <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-4 py-4 text-xs text-ink-soft sm:px-6">
            <span>Penilaian berbasis AI · band ditentukan dari skor</span>
            <span className="font-mono">0–100</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
