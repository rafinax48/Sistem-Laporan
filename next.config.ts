import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdf-parse",
    "mammoth",
    "pdfkit",
    "sharp",
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
  ],
};

export default nextConfig;
