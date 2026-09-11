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
