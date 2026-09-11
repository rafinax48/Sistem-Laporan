import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatStudentName, validateAndFormatClass } from "@/lib/student-importer";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id: practicumId, studentId } = await params;
    const body = await request.json();
    const { name, nim, className } = body;

    if (!name || !nim || !className) {
      return NextResponse.json(
        { error: "Nama, NIM, dan Kelas wajib diisi seluruhnya." },
        { status: 400 }
      );
    }

    const classCheck = validateAndFormatClass(String(className));
    if (!classCheck.valid) {
      return NextResponse.json(
        { error: classCheck.error },
        { status: 400 }
      );
    }

    const formattedName = formatStudentName(String(name));
    const formattedClass = classCheck.formatted;
    const formattedNim = String(nim).trim();

    const student = await prisma.student.findFirst({
      where: { id: studentId, practicumId },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Data praktikan tidak ditemukan." },
        { status: 404 }
      );
    }

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        name: formattedName,
        nim: formattedNim,
        className: formattedClass,
      },
    });

    // Perbarui juga nama pada riwayat laporan praktikan ini
    await prisma.report.updateMany({
      where: { studentId },
      data: { studentName: formattedName },
    });

    return NextResponse.json({ ok: true, student: updated });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Gagal memperbarui data praktikan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
