/**
 * Smoke test end-to-end: butuh GEMINI_API_KEY asli di .env.local.
 *
 * Jalankan: npm run smoke
 * Alur: buka server Next dev di port acak → uji blok 409 tanpa referensi →
 * buat referensi → nilai semua fixture → cek detail & override → matikan server.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, "..", "data", "fixtures");
const PORT = 3799;
const BASE = `http://127.0.0.1:${PORT}`;

let failed = 0;
let passed = 0;

function assert(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed++;
  else failed++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  → got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`}`,
  );
}

async function waitForServer(proc: ChildProcess, timeoutMs = 90000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (proc.exitCode !== null) {
      throw new Error(`Server berhenti sebelum siap (exit ${proc.exitCode}).`);
    }
    try {
      const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return;
    } catch {
      // belum siap
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Timeout menunggu server siap.");
}

async function uploadReference(topic: string) {
  const file = readFileSync(path.join(FIXTURES, "reference-bfs-dfs.docx"));
  const form = new FormData();
  form.set("topic", topic);
  form.set("file", new Blob([file], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "reference.docx");
  const res = await fetch(`${BASE}/api/reference`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gagal buat referensi: ${JSON.stringify(data)}`);
  return data.report as { id: string };
}

async function assessFile(fileName: string, topic: string, studentName: string) {
  const file = readFileSync(path.join(FIXTURES, fileName));
  const form = new FormData();
  form.set("topic", topic);
  form.set("studentName", studentName);
  form.set("files", new Blob([file]), fileName);
  const res = await fetch(`${BASE}/api/assess`, { method: "POST", body: form });
  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  if (!process.env.NINEROUTER_API_KEY && !process.env.GEMINI_API_KEY) {
    console.error("NINEROUTER_API_KEY belum di-set. Salin .env.example ke .env.local lalu isi key 9router.");
    process.exit(1);
  }

  const server = spawn(path.resolve("node_modules", ".bin", "next"), ["dev", "-p", String(PORT)], {
    stdio: "ignore",
    env: { ...process.env },
  });

  try {
    await waitForServer(server);
    console.log("Server siap di", BASE);

    const topic = `Smoke ${Date.now()}`;

    // 1. Blok 409 tanpa referensi
    console.log("\n— Blok tanpa referensi —");
    const blocked = await assessFile("student-good-bfs-dfs.docx", topic, "Blok");
    assert("assess diblok (409) tanpa referensi", blocked.status, 409);

    // 2. Buat referensi
    console.log("\n— Buat referensi —");
    const ref = await uploadReference(topic);
    assert("referensi tersimpan", typeof ref.id, "string");

    // 3. Nilai semua fixture
    console.log("\n— Nilai fixture (butuh API key asli, mungkin ~1 menit) —");
    const cases: [string, string][] = [
      ["student-good-bfs-dfs.docx", "Good"],
      ["student-mediocre.md", "Mediocre"],
      ["student-poor.md", "Poor"],
      ["student-boundary-80.md", "Boundary80"],
      ["student-boundary-50.md", "Boundary50"],
      ["student-scan.png", "Scan"],
    ];
    const ids: string[] = [];
    for (const [fileName, name] of cases) {
      const { status, data } = await assessFile(fileName, topic, name);
      const result = data.results?.[0];
      if (status === 200 && result?.ok) {
        console.log(`  ${fileName}: skor ${result.overallScore} (${result.overallBand})`);
        assert(`skor valid 0–100 untuk ${name}`, result.overallScore >= 0 && result.overallScore <= 100, true);
        assert(`ada 3 kategori untuk ${name}`, result.categories.length, 3);
        ids.push(result.assessmentId);
      } else {
        console.error(`  ${fileName}: GAGAL → ${JSON.stringify(data)}`);
        assert(`assess ${name} sukses`, status, 200);
      }
    }

    // 4. Detail + override
    if (ids.length > 0) {
      const id = ids[0];
      console.log("\n— Detail & override —");
      const detailRes = await fetch(`${BASE}/api/assessment/${id}`);
      const detail = (await detailRes.json()).assessment;
      assert("detail memuat 3 kategori", detail.categories.length, 3);
      assert("detail memuat array findings", Array.isArray(detail.findings), true);


      const cat = detail.categories[0];
      const newScore = cat.score === 100 ? 99 : cat.score + 1;
      const patchRes = await fetch(`${BASE}/api/assessment/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: detail.categories.map((c: { name: string; score: number; comment: string; suggestion: string }) =>
            c.name === cat.name ? { ...c, score: newScore } : c,
          ),
        }),
      });
      const patched = (await patchRes.json()).assessment;
      assert("override tersimpan", patched.overallScore !== detail.overallScore, true);
    }
  } catch (err) {
    failed++;
    console.error("Smoke test error:", err instanceof Error ? err.message : err);
  } finally {
    server.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n${failed} gagal, ${passed} lulus.`);
  if (failed > 0) process.exit(1);
}

void main();
