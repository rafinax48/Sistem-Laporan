import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

export const UPLOAD_DIR = path.resolve("data/uploads");

export async function saveUpload(
  buffer: Buffer,
  originalName: string,
): Promise<{ fileName: string; filePath: string }> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(originalName).toLowerCase();
  const storedName = `${Date.now()}-${randomUUID()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, storedName);
  await writeFile(filePath, buffer);
  return { fileName: storedName, filePath };
}
