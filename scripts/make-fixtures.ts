/**
 * Generate fixture laporan contoh (binary) untuk uji parser & smoke test.
 * Output ke data/fixtures/ (git-ignored).
 *   - reference-bfs-dfs.docx   : laporan sempurna (pembanding)
 *   - student-good-bfs-dfs.docx: skor target tinggi (~85+)
 *   - student-mediocre.md      : skor target menengah (~60)
 *   - student-poor.md          : skor target rendah (~40)
 *   - student-boundary-80.md   : kasus mepet band 80/81
 *   - student-boundary-50.md   : kasus mepet band 49/50
 *   - student-scan.png         : simulasi scan (SVG -> PNG via sharp)
 *   - reference-scan.pdf       : PDF tanpa text layer (scan, untuk uji fallback)
 *
 * Catatan: LLM tidak deterministik — konten hanya "mengarahkan" skor ke target.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Document, Packer, Paragraph, TextRun } from "docx";
import PDFDocument from "pdfkit";

const OUT = path.resolve("data/fixtures");

async function ensureDir() {
  await mkdir(OUT, { recursive: true });
}

function p(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: { after: 160 },
  });
}

function h1(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 28 })],
    spacing: { before: 240, after: 120 },
  });
}

async function writeDocx(name: string, lines: string[]) {
  const doc = new Document({
    sections: [
      {
        children: lines.map((l) => (l.startsWith("# ") ? h1(l.slice(2)) : p(l))),
      },
    ],
  });
  const buf = await Packer.toBuffer(doc);
  await writeFile(path.join(OUT, name), buf);
  console.log("  +", name);
}

async function writeText(name: string, lines: string[]) {
  await writeFile(path.join(OUT, name), lines.join("\n"), "utf-8");
  console.log("  +", name);
}

const REFERENCE_LINES = [
  "# Laporan Praktikum 5 – BFS & DFS",
  "Pendahuluan: Praktikum ini bertujuan memahami algoritma BFS (Breadth-First Search) dan DFS (Depth-First Search) untuk traversal graf, beserta implementasinya dalam Python.",
  "Dasar Teori: BFS menjelajah graf per level menggunakan struktur antrian (queue) dan dikunjungi untuk jarak terpendek pada graf tak berbobot. DFS menjelajah sedalam mungkin menggunakan tumpukan (stack) dan berguna untuk deteksi siklus serta komponen terhubung.",
  "Langkah: 1) Membuat representasi graf dengan adjacency list. 2) Implementasi BFS dengan deque dari collections. 3) Implementasi DFS rekursif. 4) Uji pada graf contoh berarah dan tidak berarah.",
  "Hasil: Traversal BFS dari simpul A menghasilkan A, B, C, D, E. Traversal DFS dari simpul A menghasilkan A, B, D, E, C. Urutan sesuai teori pada buku referensi.",
  "Pembahasan: Perbedaan urutan hasil BFS dan DFS konsisten dengan sifat masing-masing algoritma. Kompleksitas waktu keduanya O(V + E). BFS cocok untuk mencari jarak terpendek, DFS cocok untuk eksplorasi mendalam dan deteksi siklus.",
  "Kesimpulan: BFS dan DFS adalah dua strategi traversal graf yang saling melengkapi; keduanya berhasil diimplementasikan dan diuji dengan benar.",
];

const STUDENT_GOOD_LINES = [
  "# Praktikum 5 – BFS & DFS",
  "Pendahuluan: Tujuan praktikum ini adalah mempelajari algoritma BFS dan DFS untuk penjelajahan graf dan menerapkannya dalam Python.",
  "Dasar Teori: BFS menggunakan queue dan mengunjungi simpul per level, cocok untuk jarak terpendek. DFS menggunakan stack atau rekursi dan menjelajah sampai kedalaman maksimum.",
  "Langkah Percobaan: 1) Membuat adjacency list. 2) Menulis fungsi bfs dengan deque. 3) Menulis fungsi dfs rekursif. 4) Menjalankan pada graf yang sama seperti contoh di modul.",
  "Hasil Percobaan: BFS dari A: A, B, C, D, E. DFS dari A: A, B, D, E, C. Hasil sesuai dengan output yang diharapkan di modul.",
  "Pembahasan: Hasil menunjukkan perbedaan sifat traversal. Analisis kompleksitas: O(V + E) untuk keduanya. BFS menjamin lintasan terpendek pada graf tak berbobot, sementara DFS lebih hemat memori pada graf dalam.",
  "Kesimpulan: Implementasi BFS dan DFS berhasil dan sesuai teori.",
];

const STUDENT_MEDIOCRE_LINES = [
  "# Praktikum BFS dan DFS",
  "Tujuan: Memahami traversal graf.",
  "Dasar teori: BFS dan DFS adalah cara menelusuri graf.",
  "Langkah: Membuat program bfs dan dfs sederhana di Python memakai list. Menjalankan pada graf kecil.",
  "Hasil: Program berjalan dan mencetak urutan simpul.",
  "Pembahasan: Urutan yang dihasilkan terlihat berbeda antara bfs dan dfs. Belum sempat membandingkan lebih detail dengan teori.",
  "Kesimpulan: Praktikum selesai.",
];

const STUDENT_POOR_LINES = [
  "Laporan praktikum",
  "BFS dan DFS",
  "Saya membuat program graf. Output program bisa dilihat di lampiran. Kurang paham bedanya BFS dan DFS. Terima kasih.",
];

const STUDENT_BOUNDARY_80_LINES = [
  "# Praktikum 5 – BFS & DFS",
  "Pendahuluan: Mempelajari BFS dan DFS serta perbedaan keduanya.",
  "Dasar Teori: BFS berjalan per level dengan queue; DFS berjalan mendalam dengan stack. Ditulis dengan ringkas.",
  "Langkah: Implementasi bfs dan dfs di Python menggunakan adjacency list; kode dicantumkan.",
  "Hasil: BFS: A B C D E. DFS: A B D E C. Cocok dengan modul.",
  "Pembahasan: Struktur laporan cukup lengkap tetapi analisis hubungan antara teori dan hasil masih singkat; belum ada pembahasan kompleksitas atau pemilihan algoritma berdasarkan kasus.",
  "Kesimpulan: BFS dan DFS berhasil diimplementasikan.",
];

const STUDENT_BOUNDARY_50_LINES = [
  "Laporan BFS DFS",
  "Pendahuluan: Praktikum tentang traversal.",
  "Dasar teori: Ada dua algoritma traversal, BFS dan DFS.",
  "Hasil: Program jalan.",
  "Pembahasan: Tidak banyak yang bisa dianalisis karena data hasil tidak dicatat lengkap.",
  "Kesimpulan: Selesai. Struktur laporan belum lengkap dan hasil tidak terdokumentasi.",
];

async function writeScanPng() {
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100">
      <rect width="800" height="1100" fill="#fdfcf8"/>
      <text x="60" y="80" font-size="34" font-family="serif" fill="#222">LAPORAN PRAKTIKUM 5 - BFS &amp; DFS (scan)</text>
      <text x="60" y="160" font-size="26" font-family="serif" fill="#333">1. Program BFS dengan antrian:</text>
      <text x="60" y="200" font-size="26" font-family="serif" fill="#333">from collections import deque</text>
      <text x="60" y="240" font-size="26" font-family="serif" fill="#333">def bfs(graf, awal): ...</text>
      <text x="60" y="320" font-size="26" font-family="serif" fill="#333">2. Program DFS rekursif:</text>
      <text x="60" y="360" font-size="26" font-family="serif" fill="#333">def dfs(graf, simpul, dikunjungi): ...</text>
      <text x="60" y="460" font-size="26" font-family="serif" fill="#333">Hasil BFS: A B C D E</text>
      <text x="60" y="500" font-size="26" font-family="serif" fill="#333">Hasil DFS: A B D E C</text>
      <text x="60" y="580" font-size="26" font-family="serif" fill="#333">Pembahasan: urutan traversal berbeda sesuai teori.</text>
      <text x="60" y="660" font-size="26" font-family="serif" fill="#333">Kesimpulan: BFS dan DFS berhasil diimplementasikan.</text>
    </svg>`,
  );
  try {
    const sharp = (await import("sharp")).default;
    const png = await sharp(svg).png().toBuffer();
    await writeFile(path.join(OUT, "student-scan.png"), png);
    console.log("  + student-scan.png");
  } catch (err) {
    console.warn("  ! sharp gagal — lewati PNG fixture:", (err as Error).message);
  }
}

async function writeScanPdf() {
  // PDF murni berisi gambar scan (tanpa text layer) untuk menguji fallback
  // PDF-scan → Gemini vision (getText menghasilkan nyaris kosong).
  const pngPath = path.join(OUT, "student-scan.png");
  const { readFile } = await import("node:fs/promises");
  let png: Buffer | null = null;
  try {
    png = await readFile(pngPath);
  } catch {
    console.warn("  ! student-scan.png belum ada — PDF scan fixture dilewati");
    return;
  }

  const doc = new PDFDocument({ size: [800, 1100], margin: 40 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve) => doc.on("end", () => resolve()));

  doc.image(png, 40, 40, { width: 720 });
  doc.end();
  await done;
  await writeFile(path.join(OUT, "reference-scan.pdf"), Buffer.concat(chunks));
  console.log("  + reference-scan.pdf");
}

async function main() {
  await ensureDir();
  console.log("Membuat fixture di", OUT);
  await writeDocx("reference-bfs-dfs.docx", REFERENCE_LINES);
  await writeDocx("student-good-bfs-dfs.docx", STUDENT_GOOD_LINES);
  await writeText("student-mediocre.md", STUDENT_MEDIOCRE_LINES);
  await writeText("student-poor.md", STUDENT_POOR_LINES);
  await writeText("student-boundary-80.md", STUDENT_BOUNDARY_80_LINES);
  await writeText("student-boundary-50.md", STUDENT_BOUNDARY_50_LINES);
  await writeScanPng();
  await writeScanPdf();
  console.log("Selesai.");
}

void main();
