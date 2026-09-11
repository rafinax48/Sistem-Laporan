import * as XLSX from "xlsx";

export interface ParsedStudent {
  name: string;
  nim: string;
  className: string;
}

export interface ImportResult {
  success: boolean;
  students: ParsedStudent[];
  error?: string;
  columnsDetected?: {
    nameCol?: string;
    nimCol?: string;
    classCol?: string;
  };
  totalRows?: number;
}

/**
 * Membuat tiap awal/depan kata pada nama berhuruf besar (Capitalize Each Word)
 */
export function formatStudentName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

/**
 * Validasi kolom kelas:
 * - Hanya ada tepat 1 karakter alfabet saja (misal: A, B, C, a, b)
 * - Otomatisasi konversi karakter alfabet yang belum kapital menjadi huruf besar (UPPERCASE)
 */
export function validateAndFormatClass(className: string): {
  valid: boolean;
  formatted: string;
  error?: string;
} {
  const trimmed = className.trim();
  const alphaMatches = trimmed.match(/[a-zA-Z]/g) || [];

  if (alphaMatches.length !== 1) {
    return {
      valid: false,
      formatted: trimmed,
      error: `Nilai kelas "${trimmed || "(kosong)"}" tidak valid. Kelas harus memiliki tepat 1 karakter alfabet (contoh: "A", "B", "C").`,
    };
  }

  // Otomatisasi menjadi huruf besar
  const formatted = trimmed.toUpperCase();
  return {
    valid: true,
    formatted,
  };
}

/**
 * Memeriksa kecocokan nama kolom berdasarkan aturan:
 * - Mengandung unsur "nama" (case-insensitive)
 * - Mengandung unsur "nim" (case-insensitive)
 * - Mengandung unsur "kelas" (case-insensitive)
 */
function findMatchingColumn(headers: string[], keyword: string): string | undefined {
  const kw = keyword.toLowerCase();
  return headers.find((h) => h.toLowerCase().includes(kw));
}

/**
 * Ekstraksi teks dari file SVG (tag <text>, <tspan>, dll)
 */
function parseSvgContent(svgString: string): Record<string, string>[] {
  const textMatches = Array.from(
    svgString.matchAll(/<(?:text|tspan)[^>]*>([\s\S]*?)<\/(?:text|tspan)>/gi)
  ).map((m) => m[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean);

  if (textMatches.length === 0) {
    return [];
  }

  const lines: string[] = [];
  for (const text of textMatches) {
    const splitLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    lines.push(...splitLines);
  }

  if (lines.length > 0 && (lines[0].includes(",") || lines[0].includes(";") || lines[0].includes("\t"))) {
    const delimiter = lines[0].includes(",") ? "," : lines[0].includes(";") ? ";" : "\t";
    const headers = lines[0].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const records: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = parts[idx] || "";
      });
      records.push(row);
    }
    return records;
  }

  return [];
}

/**
 * Membaca berkas Excel (.xlsx, .xls), CSV (.csv), atau SVG (.svg)
 * dan memvalidasi keberadaan kolom Nama, NIM, dan Kelas,
 * serta memvalidasi nama kapital tiap kata dan kelas 1 alfabet uppercase.
 */
export function parseAndValidateStudentFile(buffer: Buffer, fileName: string): ImportResult {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  let rows: Record<string, unknown>[] = [];

  try {
    if (ext === "svg") {
      const svgText = buffer.toString("utf-8");
      rows = parseSvgContent(svgText);
      if (rows.length === 0) {
        return {
          success: false,
          students: [],
          error:
            "File SVG tidak memiliki data tabular atau teks dengan kolom yang sesuai. Pastikan file SVG memuat teks berformat tabel/kolom.",
        };
      }
    } else {
      // Excel (.xlsx, .xls) atau CSV (.csv)
      const workbook = XLSX.read(buffer, {
        type: "buffer",
        raw: false,
      });

      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return {
          success: false,
          students: [],
          error: "Lembar kerja (sheet) kosong atau tidak ditemukan dalam berkas.",
        };
      }

      const worksheet = workbook.Sheets[firstSheetName];
      rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: "",
        raw: false,
      });
    }

    if (!rows || rows.length === 0) {
      return {
        success: false,
        students: [],
        error: "Berkas tidak berisi baris data praktikan.",
      };
    }

    // Ambil semua header kolom yang ada
    const allHeaders = Object.keys(rows[0] || {}).map((h) => h.trim());

    // Validasi aturan kolom
    const nameCol = findMatchingColumn(allHeaders, "nama");
    const nimCol = findMatchingColumn(allHeaders, "nim");
    const classCol = findMatchingColumn(allHeaders, "kelas");

    const missingColumns: string[] = [];
    if (!nameCol) missingColumns.push("Nama (harus ada kata 'nama')");
    if (!nimCol) missingColumns.push("NIM (harus ada kata 'nim')");
    if (!classCol) missingColumns.push("Kelas (harus ada kata 'kelas')");

    if (missingColumns.length > 0) {
      return {
        success: false,
        students: [],
        error: `Validasi gagal! Kolom wajib berikut tidak ditemukan: ${missingColumns.join(
          ", "
        )}. Kolom yang terdeteksi di berkas Anda: [${allHeaders.join(", ") || "tidak ada"}].`,
      };
    }

    // Ambil data praktikan dari baris dan validasi format nama serta kelas
    const students: ParsedStudent[] = [];
    const classValidationErrors: string[] = [];

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx];
      const rawName = String(row[nameCol!] ?? "").trim();
      const rawNim = String(row[nimCol!] ?? "").trim();
      const rawClass = String(row[classCol!] ?? "").trim();

      // Lewati baris kosong
      if (!rawName && !rawNim && !rawClass) continue;

      // Validasi kelas: harus ada tepat 1 alfabet dan otomatis uppercase
      const classCheck = validateAndFormatClass(rawClass);
      if (!classCheck.valid) {
        classValidationErrors.push(`Baris ${idx + 2}: ${classCheck.error}`);
        // Batasi maksimal 3 contoh error agar pesan ringkas
        if (classValidationErrors.length >= 3) break;
      }

      // Format nama: tiap awal kata berhuruf besar
      const formattedName = formatStudentName(rawName);

      students.push({
        name: formattedName || "—",
        nim: rawNim || "—",
        className: classCheck.formatted || rawClass.toUpperCase(),
      });
    }

    if (classValidationErrors.length > 0) {
      return {
        success: false,
        students: [],
        error: `Validasi format kelas gagal! Bagian kelas harus memiliki tepat 1 karakter alfabet (contoh: "A", "B", "C"). Contoh kesalahan yang ditemukan:\n• ${classValidationErrors.join(
          "\n• "
        )}`,
      };
    }

    if (students.length === 0) {
      return {
        success: false,
        students: [],
        error: "Semua baris data praktikan pada file kosong setelah diproses.",
      };
    }

    return {
      success: true,
      students,
      columnsDetected: {
        nameCol,
        nimCol,
        classCol,
      },
      totalRows: students.length,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      students: [],
      error: `Terjadi kesalahan saat memproses berkas: ${errorMsg}`,
    };
  }
}
