import { getBand } from "@/lib/types";
import { computeOverallScore } from "@/lib/assess";

let failed = 0;
let passed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  → got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`}`);
}

// Batas band: 0–49 Tidak Layak, 50–80 Lumayan, 81–100 Sangat Bagus
assert("skor 0 → Tidak Layak", getBand(0), "Tidak Layak");
assert("skor 49 → Tidak Layak", getBand(49), "Tidak Layak");
assert("skor 50 → Lumayan", getBand(50), "Lumayan");
assert("skor 80 → Lumayan", getBand(80), "Lumayan");
assert("skor 81 → Sangat Bagus", getBand(81), "Sangat Bagus");
assert("skor 100 → Sangat Bagus", getBand(100), "Sangat Bagus");

// Overall dihitung di kode dari rata-rata skor kategori
assert("overall 3 kategori", computeOverallScore([70, 80, 90]), 80);
assert("overall pembulatan", computeOverallScore([49, 50, 51]), 50);
assert("overall array kosong", computeOverallScore([]), 0);

if (failed > 0) {
  console.error(`\n${failed} test(s) gagal, ${passed} lulus.`);
  process.exit(1);
}
console.log(`\nSemua ${passed} test lulus.`);
