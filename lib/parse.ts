import path from "node:path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { SUPPORTED_EXTENSIONS } from "@/lib/types";

/** Di bawah ambang ini teks PDF dianggap hasil scan tanpa text-layer → fallback ke Gemini vision. */
const MIN_PDF_TEXT_CHARS = 80;

export type FileImagePart = {
  data: string; // base64 string
  mediaType: string;
  filename?: string;
  page?: number;
};

export type ParseResult = {
  kind: "content";
  text: string;
  rawText: string;
  images: FileImagePart[];
  filename: string;
};

function extensionOf(filename: string): string {
  return path.extname(filename).toLowerCase().replace(".", "");
}

export function isSupportedFile(filename: string): boolean {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(extensionOf(filename));
}

export function mediaTypeOf(filename: string): string {
  const ext = extensionOf(filename);
  switch (ext) {
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "pdf":
      return "application/pdf";
    case "md":
      return "text/markdown";
    case "txt":
      return "text/plain";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

function addLineNumbers(text: string): string {
  const lines = text.split("\n");
  return lines
    .map((line, idx) => `[L${idx + 1}] ${line}`)
    .join("\n");
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function toBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

async function parsePdfContent(
  buffer: Buffer,
  filename: string,
): Promise<{ text: string; rawText: string; images: FileImagePart[] }> {
  const parser = new PDFParse({ data: buffer });
  let rawText = "";
  let formattedText = "";
  const images: FileImagePart[] = [];

  try {
    const textResult = await parser.getText();
    rawText = textResult.text ?? "";

    if (textResult.pages && textResult.pages.length > 0) {
      let lineCounter = 1;
      for (const page of textResult.pages) {
        formattedText += `\n=== HALAMAN ${page.num} ===\n`;
        const pageLines = (page.text || "").split("\n");
        for (const line of pageLines) {
          formattedText += `[H${page.num}:L${lineCounter}] ${line}\n`;
          lineCounter++;
        }
      }
    } else {
      formattedText = addLineNumbers(rawText);
    }
  } catch (err) {
    console.warn(`[parsePdfContent] Gagal membaca teks PDF ${filename}:`, err);
  }

  // Render visual tiap halaman PDF sebagai gambar PNG (maks 10 halaman pertama)
  try {
    const screenshot = await parser.getScreenshot({
      scale: 1.0,
      imageDataUrl: true,
    });
    if (screenshot?.pages && screenshot.pages.length > 0) {
      const maxPages = Math.min(screenshot.pages.length, 10);
      for (let i = 0; i < maxPages; i++) {
        const p = screenshot.pages[i];
        if (p?.dataUrl) {
          const base64 = p.dataUrl.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
          images.push({
            data: base64,
            mediaType: "image/png",
            filename: `${filename} (Halaman ${p.pageNumber || i + 1})`,
            page: p.pageNumber || i + 1,
          });
        }
      }
    }
  } catch (err) {
    console.warn(`[parsePdfContent] Gagal render visual screenshot PDF ${filename}:`, err);
  }

  // Jika screenshot kosong, coba ekstraksi gambar embedded sebagai fallback
  if (images.length === 0) {
    try {
      const imgResult = await parser.getImage();
      if (imgResult?.pages) {
        for (const page of imgResult.pages) {
          if (page?.images) {
            for (const img of page.images) {
              if (img?.dataUrl) {
                const base64 = img.dataUrl.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
                images.push({
                  data: base64,
                  mediaType: "image/png",
                  filename: `${filename} (Gambar Hal ${page.pageNumber})`,
                  page: page.pageNumber,
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[parsePdfContent] Gagal ekstrak gambar embedded PDF ${filename}:`, err);
    }
  }

  await parser.destroy();

  const finalFormatted = formattedText.trim()
    ? formattedText.trim()
    : `(Laporan PDF berisi scan/visual tanpa teks tertanam. Halaman visual disertakan sebagai gambar)`;

  return {
    text: finalFormatted,
    rawText: rawText.trim() || finalFormatted,
    images,
  };
}

/**
 * Jalur tunggal ekstraksi konten laporan:
 * - DOCX/MD/TXT: teks diekstrak ber-nomor baris [L1] ...
 * - PDF: teks diekstrak ber-nomor halaman & baris [H1:L1] ... BESERTA seluruh halaman yang dirender menjadi gambar PNG untuk dianalisis oleh Gemini Vision.
 * - JPG/PNG: visual gambar dikirim utuh ke Gemini Vision.
 */
export async function parseReportBuffer(
  buffer: Buffer,
  filename: string,
): Promise<ParseResult> {
  const ext = extensionOf(filename);

  if (ext === "docx") {
    const raw = await parseDocx(buffer);
    return {
      kind: "content",
      text: addLineNumbers(raw),
      rawText: raw,
      images: [],
      filename,
    };
  }

  if (ext === "md" || ext === "txt") {
    const raw = buffer.toString("utf-8");
    return {
      kind: "content",
      text: addLineNumbers(raw),
      rawText: raw,
      images: [],
      filename,
    };
  }

  if (ext === "pdf") {
    const pdfData = await parsePdfContent(buffer, filename);
    return {
      kind: "content",
      text: pdfData.text,
      rawText: pdfData.rawText,
      images: pdfData.images,
      filename,
    };
  }

  if (ext === "jpg" || ext === "jpeg" || ext === "png") {
    const mediaType = mediaTypeOf(filename);
    return {
      kind: "content",
      text: `(Laporan berupa gambar visual/scan: ${filename}. Analisis isinya dari visual.)`,
      rawText: `[Gambar: ${filename}]`,
      images: [
        {
          data: toBase64(buffer),
          mediaType,
          filename,
        },
      ],
      filename,
    };
  }

  throw new Error(
    `Format tidak didukung: ${ext}. Pakai DOCX, PDF, MD, TXT, JPG, atau PNG.`,
  );
}

