# Design System — Sistem Penilaian Laporan Praktikum

Desain untuk tool internal asisten praktikum: menilai laporan mahasiswa dengan membandingkannya ke laporan referensi. Satu identitas visual: **kertas + tinta merah pengoreksi**. Antarmukanya terasa seperti meja koreksi tugas — latar kertas, teks tinta, satu aksen merah "pena guru", dan nilai yang dicap seperti stempel.

## Prinsip

- Satu elemen ikonik: **stempel band** (`Sangat Bagus` / `Lumayan` / `Tidak Layak`) yang tampak seperti cap stempel di atas kertas — badge dengan border tajam, bayangan offset kecil, dan rotasi halus. Ini "cap nilai" yang diingat pengguna.
- Area kerja terasa seperti dokumen: kartu ber-`border` hairlines, background kertas, jarak lega. Tanpa gradien, tanpa glassmorphism, tanpa drop-shadow besar.
- Skor = data. Angka skor selalu pakai font mono dengan ukuran besar; ini membedakan "angka" dari "kata".
- Copy bahasa Indonesia, nada kalimat langsung ("Unggah referensi dulu", bukan "Mohon buat referensi terlebih dahulu").

## Tokens

### Warna

| Token | Hex | Pemakaian |
|---|---|---|
| `--ink` | `#14212E` | teks utama, heading, bordir tegas |
| `--ink-soft` | `#5B6B7C` | teks sekunder, label, placeholder |
| `--paper` | `#F4F6F5` | latar halaman (kertas dingin) |
| `--card` | `#FFFFFF` | kartu / panel konten |
| `--line` | `#DDE3E4` | hairline border, divider |
| `--red` | `#C0392B` | aksen "tinta pena" — tombol utama, link, fokus, band Tidak Layak |
| `--amber` | `#B07D1B` | band Lumayan (teks/ikon) |
| `--green` | `#1E7A46` | band Sangat Bagus (teks/ikon) |
| `--hint` | `#EEF1F0` | area drop-zone / tombol sekunder |

Band juga memakai warna latar lembut untuk stempel: `#FBECEA` (merah), `#FBF3DE` (amber), `#E6F4EC` (hijau).

### Tipografi

- **Display — Fraunces** (Google Fonts): judul halaman, angka besar, judul kartu. Serif akademik yang berkarakter; dipakai hemat.
- **Body — Source Sans 3**: teks, label, tombol, tabel.
- **Mono — JetBrains Mono**: semua angka skor, nilai band numerik, id/`fileType`, metadata. Skor adalah "data" maka pakai mono.

Skala (rem):
- `display-xl` 2.5 / body 1.6 — skor besar + stamp
- `h1` 1.75 / 1.3 — judul halaman
- `h2` 1.25 / 1.3 — judul kartu
- `body` 1 / 1.5
- `label` 0.8125 / 1.4, uppercase + `letter-spacing: 0.06em` untuk label atas-form & eyebrows
- `caption` 0.75 / 1.4 — untuk metadata

### Komponen

- **Tombol primer**: latar `--ink`, teks putih. Hover → `--red`. Tombol beraksen yang "menulis" (aksi utama = simpan/unggah/nilai).
- **Tombol sekunder**: latar `--hint`, teks `--ink`, border `--line`. Hover → border `--ink-soft`.
- **Input**: border `--line`, radius 8px, fokus border `--red` + ring lembut. Label `label` di atas input.
- **Kartu**: `--card`, border 1px `--line`, radius 10px. Tanpa shadow besar; cukup `0 1px 2px rgba(20,33,46,0.04)`.
- **Tabel**: header `label` uppercase `--ink-soft`, baris dibatasi hairline `--line`, hover baris `--hint`.
- **Stempel band** (signature): inline-flex, padding 2px 10px, border 2px warna band, latar lembut band, radius 6px, `transform: rotate(-1.5deg)`, bayangan offset 2px. Teks uppercase mono 0.75rem tebal.
- **Drop zone upload**: dashed border 2px `--line`, radius 12px, area minimal 160px, saat drag-over border `--red` + latar `#FBECEA`.
- **Empty state**: ikon sederhana (inline SVG), teks aksi + tombol, bukan hanya kalimat.

### Layout

- Struktur global: header ramping (brand `Sistem Penilaian` + nav `Beri Nilai` / `Referensi`), lalu konten satu kolom maksimal `1100px` di atas kertas.
- Halaman detail: skor sebagai blok puncak — kartu dengan `display-xl` skor mono + stempel band di sampingnya, lalu grid 3 kartu kategori di bawahnya.
- Mobil: semua grid menyatu satu kolom; tombol aksi tetap full-width.

### Motion

- Hanya micro-interaction ringan: hover tombol (transisi warna 120ms), transisi masuk kartu hasil (`fade-up` 200ms) sekali per halaman. Hormati `prefers-reduced-motion`.
- Tidak ada animasi dekoratif berulang.

### Aksesibilitas

- Kontras teks ≥ 4.5:1 (band warna hanya untuk aksen; teks band tetap `--ink` pada latar lembut).
- Fokus keyboard terlihat (`outline: 2px solid --red; outline-offset: 2px`).
- Error form: teks `--red` dengan pesan aksi, bukan sekadar border merah.

## Copy

- Tombol aksi: "Unggah", "Nilai Sekarang", "Simpan Perubahan", "Buat Referensi", "Pilih File".
- Empty state riwayat: "Belum ada penilaian. Unggah laporan mahasiswa untuk mulai."
- Blok referensi belum ada: "Tidak ada laporan referensi untuk topik ini. Buat referensi dulu sebelum menilai."
- Error: kalimat langsung + solusi ("File tidak didukung. Pakai DOCX, PDF, MD, TXT, JPG, atau PNG.")
