import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id: practicumId, studentId } = await params;

    const student = await prisma.student.findFirst({
      where: { id: studentId, practicumId },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Data praktikan tidak ditemukan." },
        { status: 404 }
      );
    }

    await prisma.student.delete({
      where: { id: studentId },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus praktikan.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
