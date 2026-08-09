import path from "node:path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { SUPPORTED_EXTENSIONS } from "@/lib/types";

/** Di bawah ambang ini teks PDF dianggap hasil scan tanpa text-layer → fallback ke Gemini vision. */
const MIN_PDF_TEXT_CHARS = 80;

export type ParseResult =
  | { kind: "text"; text: string }
  | {
      kind: "file";
      data: string;
      mediaType: string;
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

async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function parsePdf(buffer: Buffer): Promise<ParseResult | null> {
  let text = "";
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    text = result.text ?? "";
  } catch {
    return null;
  } finally {
    await parser.destroy();
  }
  if (text.trim().length < MIN_PDF_TEXT_CHARS) {
    return null;
  }
  return { kind: "text", text };
}

function toBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

/**
 * Jalur tunggal ekstraksi konten laporan.
 * - DOCX/MD/TXT/PDF ber-text-layer → teks.
 * - PDF scan (teks kosong) & gambar → file part untuk Gemini vision.
 */
export async function parseReportBuffer(
  buffer: Buffer,
  filename: string,
): Promise<ParseResult> {
  const ext = extensionOf(filename);

  if (ext === "docx") {
    return { kind: "text", text: await parseDocx(buffer) };
  }

  if (ext === "md" || ext === "txt") {
    return { kind: "text", text: buffer.toString("utf-8") };
  }

  if (ext === "pdf") {
    const textResult = await parsePdf(buffer);
    if (textResult) return textResult;
    return {
      kind: "file",
      data: toBase64(buffer),
      mediaType: "application/pdf",
      filename,
    };
  }

  if (ext === "jpg" || ext === "jpeg" || ext === "png") {
    return {
      kind: "file",
      data: toBase64(buffer),
      mediaType: mediaTypeOf(filename),
      filename,
    };
  }

  throw new Error(
    `Format tidak didukung: ${ext}. Pakai DOCX, PDF, MD, TXT, JPG, atau PNG.`,
  );
}
