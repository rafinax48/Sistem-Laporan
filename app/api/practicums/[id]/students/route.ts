import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  parseAndValidateStudentFile,
  formatStudentName,
  validateAndFormatClass,
} from "@/lib/student-importer";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: practicumId } = await params;
    const students = await prisma.student.findMany({
      where: { practicumId },
      orderBy: [{ className: "asc" }, { nim: "asc" }],
    });

    return NextResponse.json({ students });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengambil data praktikan.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: practicumId } = await params;

    const practicum = await prisma.practicum.findUnique({
      where: { id: practicumId },
    });

    if (!practicum) {
      return NextResponse.json(
        { error: "Praktikum tidak ditemukan." },
        { status: 404 }
      );
    }

    const contentType = request.headers.get("content-type") || "";

    // 1. Mode Input Lewat File (Excel, CSV, SVG)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Berkas (file) praktikan wajib diunggah." },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const parseResult = parseAndValidateStudentFile(buffer, file.name);

      if (!parseResult.success) {
        return NextResponse.json(
          {
            error: parseResult.error || "Validasi berkas praktikan gagal.",
          },
          { status: 400 }
        );
      }

      // Masukkan ke database
      const createdStudents = await prisma.$transaction(
        parseResult.students.map((st) =>
          prisma.student.create({
            data: {
              practicumId,
              name: st.name,
              nim: st.nim,
              className: st.className,
            },
          })
        )
      );

      return NextResponse.json(
        {
          success: true,
          count: createdStudents.length,
          columnsDetected: parseResult.columnsDetected,
          message: `Berhasil mengimpor ${createdStudents.length} praktikan dari berkas.`,
        },
        { status: 201 }
      );
    }

    // 2. Mode Input Manual (JSON: name, nim, className)
    const body = await request.json();
    const rawName = String(body.name || "").trim();
    const rawNim = String(body.nim || "").trim();
    const rawClass = String(body.className || "").trim();

    if (!rawName) {
      return NextResponse.json(
        { error: "Nama praktikan wajib diisi." },
        { status: 400 }
      );
    }

    if (!rawNim) {
      return NextResponse.json(
        { error: "NIM praktikan wajib diisi." },
        { status: 400 }
      );
    }

    if (!rawClass) {
      return NextResponse.json(
        { error: "Kelas praktikan wajib diisi." },
        { status: 400 }
      );
    }

    // Validasi kelas: harus ada tepat 1 karakter alfabet
    const classCheck = validateAndFormatClass(rawClass);
    if (!classCheck.valid) {
      return NextResponse.json(
        { error: classCheck.error },
        { status: 400 }
      );
    }

    const name = formatStudentName(rawName);
    const className = classCheck.formatted;

    const student = await prisma.student.create({
      data: {
        practicumId,
        name,
        nim: rawNim,
        className,
      },
    });

    return NextResponse.json(
      {
        success: true,
        student,
        message: "Praktikan berhasil ditambahkan secara manual.",
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memproses penambahan praktikan.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
