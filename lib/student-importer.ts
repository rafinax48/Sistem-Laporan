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
 * Membersihkan format NIM dari Excel (scientific notation, trailing decimals, spasi)
 */
export function cleanNim(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val).trim();
  // Tangani notasi ilmiah dari Excel (misal 2.400018208e+09)
  if (/^[0-9]+(\.[0-9]+)?[eE]\+[0-9]+$/.test(str)) {
    const num = Number(str);
    if (!isNaN(num)) {
      str = BigInt(Math.round(num)).toString();
    }
  }
  // Hilangkan trailing desimal pecahan .0 atau .00
  str = str.replace(/\.0+$/, "");
  // Hilangkan karakter non-alfanumerik di awal/akhir
  return str.trim();
}

/**
 * Membuat tiap awal/depan kata pada nama berhuruf besar (Capitalize Each Word),
 * menangani tanda kutip (Syafi'i) dan tanda hubung (Nur-Aini).
 */
export function formatStudentName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  return trimmed
    .toLowerCase()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => {
      if (!word) return "";
      // Handle tanda hubung seperti Nur-Aini
      if (word.includes("-")) {
        return word
          .split("-")
          .map((sub) => (sub ? sub.charAt(0).toUpperCase() + sub.slice(1) : ""))
          .join("-");
      }
      // Handle tanda petik seperti Syafi'i atau D'Arcy
      if (word.includes("'")) {
        return word
          .split("'")
          .map((sub) => (sub ? sub.charAt(0).toUpperCase() + sub.slice(1) : ""))
          .join("'");
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Validasi kolom kelas:
 * - Menangani input tunggal seperti "A", "b", atau " C "
 * - Menangani toleransi format awalan umum seperti "Kelas A", "Praktikum B", "IF-A" -> "A" / "B"
 * - Otomatisasi konversi karakter alfabet menjadi huruf besar (UPPERCASE)
 */
export function validateAndFormatClass(className: string): {
  valid: boolean;
  formatted: string;
  error?: string;
} {
  const trimmed = className.trim();
  if (!trimmed) {
    return {
      valid: false,
      formatted: "",
      error: `Kolom kelas tidak boleh kosong. Isikan 1 karakter kelas (contoh: "A", "B", "C").`,
    };
  }

  // Jika tepat 1 huruf (misal: "A" atau "b")
  if (/^[a-zA-Z]$/.test(trimmed)) {
    return { valid: true, formatted: trimmed.toUpperCase() };
  }

  // Jika berformat awalan seperti "Kelas A", "Kelas-B", "IF A", "Praktikum A"
  const prefixMatch = trimmed.match(/(?:kelas|praktikum|shift|if|ti)[\s\-_:]*([a-zA-Z])\b/i);
  if (prefixMatch && prefixMatch[1]) {
    return { valid: true, formatted: prefixMatch[1].toUpperCase() };
  }

  // Jika ada sufiks huruf di akhir kata seperti "2A" atau "IF-A"
  const suffixMatch = trimmed.match(/\b(?:[0-9]+|IF|TI)[\s\-_:]*([a-zA-Z])$/i);
  if (suffixMatch && suffixMatch[1]) {
    return { valid: true, formatted: suffixMatch[1].toUpperCase() };
  }

  const alphaMatches = trimmed.match(/[a-zA-Z]/g) || [];
  if (alphaMatches.length === 1) {
    return {
      valid: true,
      formatted: alphaMatches[0].toUpperCase(),
    };
  }

  return {
    valid: false,
    formatted: trimmed,
    error: `Nilai kelas "${trimmed}" tidak valid. Kelas harus berupa 1 karakter alfabet (contoh: "A", "B", "C").`,
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
      const rawNim = cleanNim(row[nimCol!]);
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
