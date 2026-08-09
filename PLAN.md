# PLAN — Sistem Penilaian Laporan Praktikum Berbasis AI

Konteks: tool internal untuk asisten praktikum menilai laporan dari praktikan, dengan pembanding berupa laporan referensi ("laporan sempurna") per topik praktikum.

## Keputusan yang sudah dikunci

1. **Referensi wajib** — assess diblok jika tidak ada `Report(kind: REFERENCE)` dengan topic cocok (atau template generik `topic=null`); UI menyuruh user membuat referensi dulu.
2. **Satu assessment per laporan** — `Assessment.reportId @unique` tetap; halaman detail hanya **edit manual** (override skor/komentar), tanpa re-run AI.
3. **Fixture binary di-generate** — dev-deps `docx` + `pdfkit` + `sharp` (SVG→PNG untuk fixture "scan"), lewat `scripts/make-fixtures.ts`.
4. **Git init + `design.md`** dibuat sebagai bagian scaffold.

## Stack

- Next.js 15 (App Router) + TypeScript di root repo
- Vercel AI SDK (`ai` + `@ai-sdk/google`) → Gemini Flash
  - **Pin versi AI SDK yang `generateObject` masih stabil** (v5; v6 menandai deprecated). Atau pakai API output baru (`generateText` + `output: 'object'`) bila versi terpasang sudah v6+.
  - Model Gemini Flash: **cek AI Studio pas setup** karena penamaan versi & rate limit sering berubah. Model ID disimpan di konstanta `lib/types.ts` biar gampang diganti.
- SQLite via Prisma untuk riwayat laporan, laporan referensi, & hasil penilaian
- Parser (4 jalur):
  - DOCX → `mammoth`
  - MD/TXT → baca langsung
  - PDF → `pdf-parse` **v2** (bukan v1 — v1 punya crash ENOENT + deprecation `Buffer()` di Node baru; v2 pure TS, class `PDFParse`/`getText()`, tanpa native deps). Kalau hasil ekstraksi kosong/nyaris kosong (indikasi hasil scan tanpa text layer), fallback kirim file PDF langsung ke Gemini sebagai content part `{ type: 'file', data: base64, mediaType: 'application/pdf' }`.
  - Gambar (JPG/PNG, hasil scan/foto) → Gemini vision langsung
- `zod` untuk structured output — LLM hanya generate skor (integer 0–100) + komentar + saran per kategori. Band tidak digenerate LLM, dihitung deterministic di kode dari skor.
- UI mengikuti skill `frontend-design` dan `design.md`.

## Skala Nilai

Partisi 0–100 penuh tanpa celah/tumpang tindih:

- `0–49` → Tidak Layak
- `50–80` → Lumayan
- `81–100` → Sangat Bagus

3 kategori penilaian, masing-masing skor 0–100 (`z.number().int().min(0).max(100)`) + band (dihitung di kode) + komentar + saran perbaikan, semua Bahasa Indonesia:

- Kelengkapan struktur
- Kebenaran isi
- Kedalaman analisis

```ts
function getBand(score: number): "Tidak Layak" | "Lumayan" | "Sangat Bagus" {
  if (score >= 81) return "Sangat Bagus";
  if (score >= 50) return "Lumayan";
  return "Tidak Layak";
}
```

## Data Model (Prisma)

Report menyatukan laporan mahasiswa DAN laporan referensi lewat field `kind`, supaya reuse parser & upload flow yang sama. Field `topic` fleksibel: diisi nama topik/pertemuan kalau referensinya spesifik per minggu, atau null kalau satu template generik dipakai lintas topik.

```prisma
enum ReportKind {
  STUDENT
  REFERENCE
}

model Report {
  id          String     @id @default(cuid())
  kind        ReportKind
  topic       String?    // "Praktikum 5 - BFS & DFS"; null = template generik
  studentName String?
  fileName    String
  filePath    String
  fileType    String
  rawText     String?
  createdAt   DateTime   @default(now())

  subjectOf   Assessment?  @relation("Subject")
  usedAsRef   Assessment[] @relation("Reference")
}

model Assessment {
  id                String     @id @default(cuid())
  reportId          String     @unique
  report            Report     @relation("Subject", fields: [reportId], references: [id])
  referenceReportId String?
  referenceReport   Report?    @relation("Reference", fields: [referenceReportId], references: [id])
  overallScore      Int?
  categories        AssessmentCategory[]
  createdAt         DateTime   @default(now())
}

model AssessmentCategory {
  id           String     @id @default(cuid())
  assessmentId String
  assessment   Assessment @relation(fields: [assessmentId], references: [id])
  name         String     // kelengkapan_struktur | kebenaran_isi | kedalaman_analisis
  score        Int
  comment      String
  suggestion   String
}
```

## Alur

1. Upload laporan referensi ("laporan sempurna") sekali per topik lewat halaman kelola referensi → simpan sebagai `Report(kind: REFERENCE, topic: ...)`.
2. Upload laporan mahasiswa (mendukung multi-file) → simpan file ke `data/uploads/` → `Report(kind: STUDENT)`.
3. Ekstrak teks (parser 4 jalur) → simpan ke `rawText`.
4. Cocokkan/pilih `Report(kind: REFERENCE)` berdasarkan topic yang sama sebagai pembanding. **Tidak ada yang cocok → block (409 + pesan buat referensi dulu).**
5. Prompt rubrik (isi laporan mahasiswa + isi laporan referensi sebagai konteks pembanding, anchor/deskriptor konkret per band per kategori) → `generateObject` (temperature rendah ~0.2–0.3, output skor+komentar+saran per kategori saja).
6. Hitung band per kategori dari skor di kode → simpan `Assessment` + `AssessmentCategory` ke SQLite.
7. Tampilkan halaman detail dengan opsi **edit/override manual** skor & komentar (tanpa re-run AI) + halaman riwayat.

## Struktur yang akan dibuat

```
app/page.tsx                    — upload laporan mahasiswa (multi-file) + riwayat
app/reference/page.tsx          — kelola laporan referensi per topik
app/assessment/[id]/page.tsx    — detail hasil + edit/override skor
app/api/assess/route.ts         — pipeline penilaian (sequential + retry-backoff 429)
app/api/reference/route.ts      — CRUD laporan referensi
app/api/assessment/[id]/route.ts— GET detail / PATCH override (re-hitung overall)
lib/parse.ts                    — parser 4 format + fallback PDF scan → Gemini file part
lib/assess.ts                   — rubrik prompt + generateObject + hitung band
lib/db.ts                       — singleton PrismaClient
lib/env.ts                      — validasi env fail-fast
lib/types.ts                    — zod schema + TS types + model id Gemini
prisma/schema.prisma
.env                            — DATABASE_URL (dibaca Prisma CLI & Next)
.env.local                      — GEMINI_API_KEY (git-ignored)
data/                           — db + uploads (git-ignored, dengan .gitkeep)
scripts/make-fixtures.ts        — generate fixture binary (docx/pdfkit/sharp)
scripts/smoke.ts                — smoke test pipeline end-to-end (butuh key asli)
design.md                       — design system (dari skill frontend-design)
next.config.ts                  — serverExternalPackages: ['pdf-parse']
```

## Eksekusi

0. Scaffold: `git init`, `create-next-app` (TS, App Router, Tailwind), `design.md`, `.gitignore` + `data/.gitkeep`, skrip package.json: `lint`, `typecheck`, `build`, `test`, `fixtures`, `smoke`.
1. Skema DB (Report/Assessment/AssessmentCategory dengan relasi bernama `Subject` & `Reference`) + migrasi. `DATABASE_URL="file:../data/app.db"` di `.env`.
2. Parser 4 format, termasuk fallback PDF-scan → Gemini file part.
3. Halaman + API CRUD laporan referensi per topik.
4. Pipeline AI: rubrik prompt + konteks referensi + `generateObject` (skor only) + hitung band di kode.
5. API route assess + UI (multi-file upload, halaman detail dengan edit/override skor).
6. Fixture: 2–3 laporan contoh termasuk kasus skor mepet batas band (49/50, 80/81) untuk smoke test pipeline end-to-end.
7. Validasi env var `GEMINI_API_KEY` fail-fast saat startup (via `instrumentation.ts` dengan guard `NEXT_PHASE !== 'phase-production-build'` agar `next build` tanpa key tidak gagal) + validasi ulang saat request assess.
8. Verifikasi: `npm run lint`, `typecheck`, `next build`, uji manual tiap format parser, uji throttling saat assess banyak laporan sekaligus.

## Keterbatasan

- PDF hasil scan tetap kepengaruh kualitas scan-nya — fallback ke Gemini vision membantu signifikan, tapi tidak seakurat PDF dengan text layer asli.
- Free tier Gemini Flash punya limit RPM/RPD yang cukup ketat — proses assess batch perlu di-throttle/sequential + retry-backoff untuk error 429.
- LLM tidak deterministik — band dihitung di kode (bukan LLM), batas band di-unit-test; fixture "mepet batas" hanya mengarahkan, bukan jaminan.
- Desain saat ini (SQLite lokal + `data/uploads/`) diasumsikan dijalankan lokal (`npm run dev`). Kalau nanti di-deploy ke platform serverless (Vercel dkk), perlu migrasi ke hosted DB (Turso/libSQL) + object storage (Vercel Blob/S3), karena filesystem-nya ephemeral.

## Risiko yang dimitigasi

- `pdf-parse` v1 (crash ENOENT + deprecation Buffer) → pakai v2 yang terawat.
- AI SDK 6 deprecation `generateObject` → pin v5 atau pakai API output baru.
- Node 26 + native deps (sharp/Prisma engine) → fallback fixture PNG embedded bila sharp gagal install.
- `next build` tanpa key → guard `NEXT_PHASE` di instrumentasi.
