import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/**
 * PATCH /api/files/[fileId]/share/people/[shareId]
 * Update person's permission
 */
export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ fileId: string; shareId: string }> | { fileId: string; shareId: string }
  }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { fileId, shareId } = resolvedParams

    const body = await request.json()
    const { permission } = body

    if (!permission || !["viewer", "commenter", "editor"].includes(permission)) {
      return NextResponse.json({ error: "Invalid permission" }, { status: 400 })
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

    // Update share
    const share = await prisma.fileShare.update({
      where: { id: shareId },
      data: { permission },
    })

    return NextResponse.json({
      success: true,
      share: {
        id: share.id,
        permission: share.permission,
      },
    })
  } catch (error) {
    console.error("Error updating share permission:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/files/[fileId]/share/people/[shareId]
 * Remove person from share
 */
export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ fileId: string; shareId: string }> | { fileId: string; shareId: string }
  }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { fileId, shareId } = resolvedParams

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

    // Delete share
    await prisma.fileShare.delete({
      where: { id: shareId },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("Error removing share:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

