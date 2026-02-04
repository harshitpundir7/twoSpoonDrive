import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/**
 * PATCH /api/files/[fileId]/star
 * Toggle star status of a file or folder
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> | { fileId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { fileId } = resolvedParams

    const body = await request.json()
    const { isStarred } = body

    if (typeof isStarred !== "boolean") {
      return NextResponse.json({ error: "isStarred must be a boolean" }, { status: 400 })
    }

    // Verify file ownership
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: session.user.id,
        deletedAt: null,
      },
    })

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Update star status
    const updated = await prisma.file.update({
      where: { id: fileId },
      data: { isStarred },
    })

    return NextResponse.json({
      success: true,
      isStarred: updated.isStarred,
    })
  } catch (error) {
    console.error("Error updating star status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

