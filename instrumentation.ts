export async function register() {
  // Jangan gagalkan `next build` bila key belum diset (mis. di CI).
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY belum diset. Salin .env.example ke .env.local dan isi key dari AI Studio.",
    );
  }
}
