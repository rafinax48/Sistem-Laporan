import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/db";
import { BASIS_DATA_CURRICULUM } from "../lib/curriculum/basis-data";

async function main() {
  console.log("=== Memulai Sinkronisasi Kurikulum Basis Data (OBE 2026) ===");

  // Buat direktori data/curriculum jika belum ada
  const curriculumDir = path.resolve("data/curriculum");
  if (!fs.existsSync(curriculumDir)) {
    fs.mkdirSync(curriculumDir, { recursive: true });
  }

  // 1. Cari atau buat Praktikum Basis Data
  let practicum = await prisma.practicum.findFirst({
    where: { name: { contains: "Basis Data" } },
  });

  if (!practicum) {
    practicum = await prisma.practicum.create({
      data: {
        name: "Praktikum Basis Data (OBE 2026)",
        slot: "Kurikulum OBE 2026",
        totalMeetings: 12,
      },
    });
    console.log(`[+] Praktikum baru dibuat: "${practicum.name}" (ID: ${practicum.id})`);
  } else {
    practicum = await prisma.practicum.update({
      where: { id: practicum.id },
      data: {
        totalMeetings: 12,
        name: "Praktikum Basis Data (OBE 2026)",
      },
    });
    console.log(`[*] Praktikum diperbarui: "${practicum.name}" (ID: ${practicum.id}) dengan 12 pertemuan.`);
  }

  // 2. Sinkronisasi 12 Modul sebagai Reference Reports
  for (const mod of BASIS_DATA_CURRICULUM) {
    const safeTopic = mod.topic.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `Modul_${String(mod.meetingNumber).padStart(2, "0")}_${safeTopic}.md`;
    const filePath = path.join(curriculumDir, fileName);

    // Tulis berkas acuan ke disk
    fs.writeFileSync(filePath, mod.referenceMarkdown, "utf8");

    // Cari referensi pertemuan di database
    const existing = await prisma.report.findFirst({
      where: {
        kind: "REFERENCE",
        practicumId: practicum.id,
        meetingNumber: mod.meetingNumber,
      },
    });

    if (existing) {
      await prisma.report.update({
        where: { id: existing.id },
        data: {
          topic: mod.topic,
          fileName,
          filePath,
          rawText: mod.referenceMarkdown,
        },
      });
      console.log(`  ✓ Modul P${mod.meetingNumber} diperbarui di database: "${mod.topic}"`);
    } else {
      await prisma.report.create({
        data: {
          kind: "REFERENCE",
          practicumId: practicum.id,
          meetingNumber: mod.meetingNumber,
          topic: mod.topic,
          fileName,
          filePath,
          fileType: "text/markdown",
          rawText: mod.referenceMarkdown,
        },
      });
      console.log(`  + Modul P${mod.meetingNumber} didaftarkan di database: "${mod.topic}"`);
    }
  }

  console.log("=== Sinkronisasi 12 Modul Basis Data Selesai Sukses! ===");
}

main()
  .catch((err) => {
    console.error("Gagal sinkronisasi:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
