import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { fileId } = body

    if (!fileId || typeof fileId !== "string") {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 })
    }

    // Verify file exists and belongs to user
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: session.user.id,
        isFolder: false,
        deletedAt: null,
      },
    })

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // File upload is complete - file record already exists
    // In the future, you could verify the file exists in S3 here
    // For now, we'll just return success

    return NextResponse.json({
      success: true,
      file: {
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        createdAt: file.createdAt,
      },
    })
  } catch (error) {
    console.error("Error completing upload:", error)
    return NextResponse.json(
      { error: "Failed to complete upload" },
      { status: 500 }
    )
  }
}

