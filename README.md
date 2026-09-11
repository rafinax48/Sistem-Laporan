<div align="center">

# 📋 Sistem Laporan Praktikum
### *AI-Powered Lab Report Assessment System*

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.9-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![SQLite](https://img.shields.io/badge/SQLite-Better--SQLite3-003B57?style=for-the-badge&logo=sqlite)](https://www.sqlite.org/)

<p align="center">
  <b>Projek Pertama:</b> Platform otomasi penilaian laporan praktikum berbasis kecerdasan buatan (AI) yang dirancang khusus untuk mempermudah pekerjaan <b>Asisten Praktikum (Asprak)</b> dalam mengoreksi, mengevaluasi, dan memberikan nilai secara objektif serta transparan.
</p>

[Fitur Utama](#-fitur-utama) • [Alur Penggunaan](#-langkah-langkah-penggunaan) • [Tech Stack](#-teknologi-yang-digunakan) • [Panduan Instalasi](#-cara-menjalankan-secara-lokal)

---

</div>

## 📖 Tentang Projek

Menilai puluhan hingga ratusan laporan praktikum mahasiswa secara manual membutuhkan waktu yang sangat lama dan rentan terhadap subjektivitas. **Sistem Laporan** hadir sebagai solusi berbasis web untuk membantu asisten praktikum:

- **Bandingkan Berdasarkan Standar Acuan**: Setiap laporan praktikan dinilai secara langsung terhadap *Laporan Referensi* (kunci jawaban/standar nilai terbaik) untuk topik praktikum terkait.
- **Konsistensi Penilaian**: Menggunakan AI SDK (Google Gemini / OpenAI) dengan rubrik terstruktur sehingga standar penilaian tetap seragam untuk seluruh praktikan.
- **Human-in-the-Loop**: Asisten praktikum tetap memegang kendali penuh melalui fitur *Manual Override* untuk meninjau dan menyesuaikan skor serta feedback jika diperlukan.

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
| :--- | :--- |
| 📑 **Manajemen Laporan Referensi** | Kelola laporan acuan per topik modul praktikum sebagai tolok ukur evaluasi. |
| 📁 **Dukungan Berbagai Format** | Menerima berkas laporan praktikan dalam format dokumen **PDF** (`.pdf`) dan **Word** (`.docx`). |
| 🤖 **Evaluasi Otomatis Berbasis AI** | Menganalisis kelengkapan struktur, metodologi, analisis data, hingga kesimpulan secara mendalam. |
| 🎯 **Sistem Grade & Band Nilai** | Mengelompokkan hasil nilai ke dalam predikat mutu (`A`, `AB`, `B`, `BC`, `C`, `D`, `E`). |
| ✏️ **Review & Override Asprak** | Fleksibilitas bagi asisten untuk mengedit nilai rubrik atau catatan evaluasi secara manual. |
| 🕒 **Riwayat Penilaian (History)** | Dashboard ringkas untuk memantau daftar laporan yang sudah dinilai beserta skornya. |

---

## 🚀 Langkah-langkah Penggunaan

Berikut panduan praktis alur penggunaan sistem dari awal hingga laporan selesai dinilai:

```mermaid
graph LR
    A[1. Unggah Referensi] --> B[2. Unggah Laporan Praktikan]
    B --> C[3. Analisis & Penilaian AI]
    C --> D[4. Review & Override Nilai]
    D --> E[5. Nilai Final Tersimpan]
```

### 1. Siapkan Laporan Referensi (Kunci Acuan)
1. Buka menu navigasi **Referensi** di aplikasi.
2. Masukkan nama topik modul praktikum (contoh: *Modul 1: Jaringan Komputer*).
3. Unggah file laporan acuan yang menjadi patokan jawaban sempurna.
4. Simpan referensi. *(Tahap penilaian mahasiswa membutuhkan minimal 1 referensi aktif per topik).*

### 2. Unggah Laporan Praktikan
1. Kembali ke halaman utama (**Beri Nilai**).
2. Pilih topik praktikum yang sesuai dari dropdown.
3. Unggah satu atau beberapa file laporan mahasiswa (format `.pdf` atau `.docx`).
4. Klik tombol **Nilai Laporan**.

### 3. Tinjau Hasil Evaluasi
1. Sistem akan mengekstraksi teks dokumen dan melakukan penilaian otomatis melalui AI.
2. Pada halaman detail penilaian (`/assessment/[id]`), Anda dapat melihat:
   - **Skor Total & Grade Band**
   - **Rincian Rubrik Penilaian** (Poin per kriteria)
   - **Kelebihan & Kekurangan** laporan praktikan
   - **Saran Perbaikan** untuk mahasiswa

### 4. Sesuaikan Nilai (Opsional)
- Jika ada poin yang perlu dikoreksi berdasarkan kebijakan laboratorium, asisten praktikum dapat menggunakan formulir **Override Nilai** di bagian bawah laporan.

---

## 🛠️ Teknologi yang Digunakan

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Components & Server Actions)
- **Bahasa**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Database & ORM**: [Prisma ORM](https://www.prisma.io/) dengan SQLite (`better-sqlite3`)
- **AI Integration**: [Vercel AI SDK](https://sdk.vercel.ai/) (`@ai-sdk/google`, `@ai-sdk/openai`)
- **Document Parsers**: `mammoth` (DOCX parsing) & `pdf-parse` (PDF extraction)

---

## 💻 Cara Menjalankan Secara Lokal

Ikuti langkah-langkah berikut untuk menjalankan projek di komputer Anda:

### 1. Clone Repository
```bash
git clone https://github.com/rafinax48/Sistem-Laporan.git
cd Sistem-Laporan
```

### 2. Install Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env.local` atau `.env`:
```bash
cp .env.example .env
```
Isi kredensial API AI yang Anda gunakan:
```env
DATABASE_URL="file:./data/dev.db"
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key-here"
# atau OPENAI_API_KEY="your-openai-api-key-here"
```

### 4. Setup Database
Inisialisasi database SQLite dan jalankan migrasi Prisma:
```bash
npx prisma migrate dev
```

### 5. Jalankan Server Development
```bash
npm run dev
```
Buka browser dan akses [http://localhost:3000](http://localhost:3000).

---

## 👨‍💻 Pengembang

**Projek Pertama oleh:**
- **GitHub**: [@rafinax48](https://github.com/rafinax48)
- **Institusi**: Mata Kuliah Semester 5

---

<div align="center">
  <sub>Dibuat dengan ❤️ untuk kemudahan asisten praktikum dan mahasiswa.</sub>
</div>
