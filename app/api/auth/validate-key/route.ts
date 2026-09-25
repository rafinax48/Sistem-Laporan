import { NextRequest, NextResponse } from "next/server";
import { getRouterConfig } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

    if (!apiKey) {
      return NextResponse.json(
        { valid: false, error: "API Key Gemini tidak boleh kosong." },
        { status: 400 }
      );
    }

    // 1. Coba verifikasi langsung ke Google Gemini API (standar Google AI Studio)
    try {
      const googleRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        { method: "GET", headers: { Accept: "application/json" } }
      );

      if (googleRes.ok) {
        const data = await googleRes.json();
        const modelCount = Array.isArray(data.models) ? data.models.length : 0;
        return NextResponse.json({
          valid: true,
          provider: "Google AI Studio",
          message: `Koneksi Google Gemini API berhasil diverifikasi (${modelCount} model tersedia).`,
        });
      }

      // Jika error 400/403 dari Google, ambil pesan errornya
      if (googleRes.status === 400 || googleRes.status === 403) {
        const errorData = await googleRes.json().catch(() => null);
        const errMsg =
          errorData?.error?.message ||
          "API key tidak valid atau kuota Google AI Studio habis.";

        // Jika tidak berawalan AIzaSy, mungkin ini adalah proxy router key lokal
        if (!apiKey.startsWith("AIzaSy")) {
          // Lanjut coba opsi 2 (OpenAI-compatible proxy)
        } else {
          return NextResponse.json(
            { valid: false, error: errMsg },
            { status: 400 }
          );
        }
      }
    } catch {
      // Abaikan jika network error ke Google, coba proxy lokal di bawah
    }

    // 2. Coba verifikasi ke endpoint OpenAI-compatible / proxy router lokal
    const { baseURL } = getRouterConfig();
    try {
      const proxyRes = await fetch(`${baseURL}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      });

      if (proxyRes.ok) {
        return NextResponse.json({
          valid: true,
          provider: "Router Proxy",
          message: "API Key berhasil diverifikasi melalui router lokal.",
        });
      }
    } catch {
      // Abaikan
    }

    return NextResponse.json(
      {
        valid: false,
        error:
          "API key tidak dapat diverifikasi oleh Google AI Studio maupun router proxy. Pastikan kunci benar dari aistudio.google.com.",
      },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memvalidasi key.";
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
}
