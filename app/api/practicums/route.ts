import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const practicums = await prisma.practicum.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            students: true,
            reports: true,
          },
        },
      },
    });

    return NextResponse.json({ practicums });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengambil data praktikum.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const slot = String(body.slot || "").trim();
    const totalMeetings = Number(body.totalMeetings) || 8;

    if (!name) {
      return NextResponse.json(
        { error: "Nama praktikum / mata kuliah wajib diisi." },
        { status: 400 }
      );
    }

    if (!slot) {
      return NextResponse.json(
        { error: "Slot waktu / jadwal praktikum wajib diisi." },
        { status: 400 }
      );
    }

    if (totalMeetings <= 0 || totalMeetings > 32) {
      return NextResponse.json(
        { error: "Jumlah pertemuan harus antara 1 sampai 32." },
        { status: 400 }
      );
    }

    const practicum = await prisma.practicum.create({
      data: {
        name,
        slot,
        totalMeetings,
      },
    });

    return NextResponse.json({ practicum }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal membuat data praktikum.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
