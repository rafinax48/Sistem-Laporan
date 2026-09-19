import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const practicum = await prisma.practicum.findUnique({
      where: { id },
      include: {
        students: {
          orderBy: [{ className: "asc" }, { nim: "asc" }],
        },
        _count: {
          select: {
            students: true,
            reports: true,
          },
        },
      },
    });

    if (!practicum) {
      return NextResponse.json(
        { error: "Praktikum tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ practicum });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengambil detail praktikum.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const practicum = await prisma.practicum.findUnique({
      where: { id },
    });

    if (!practicum) {
      return NextResponse.json(
        { error: "Praktikum tidak ditemukan." },
        { status: 404 }
      );
    }

    // Hapus laporan mahasiswa yang terkait dengan praktikum ini sebelum menghapus jadwal
    await prisma.report.deleteMany({
      where: {
        kind: "STUDENT",
        OR: [
          { practicumId: id },
          { student: { practicumId: id } },
        ],
      },
    });

    await prisma.practicum.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus praktikum.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, slot, totalMeetings } = body;

    const practicum = await prisma.practicum.findUnique({
      where: { id },
    });

    if (!practicum) {
      return NextResponse.json(
        { error: "Praktikum tidak ditemukan." },
        { status: 404 }
      );
    }

    const updated = await prisma.practicum.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(slot !== undefined && { slot: String(slot).trim() }),
        ...(totalMeetings !== undefined && {
          totalMeetings: Math.max(1, Math.min(32, Number(totalMeetings) || 8)),
        }),
      },
    });

    return NextResponse.json({ ok: true, practicum: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memperbarui data praktikum.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
