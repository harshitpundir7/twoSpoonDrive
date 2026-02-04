import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> | { fileId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Handle both Promise and direct params (Next.js 16 compatibility)
    const resolvedParams = params instanceof Promise ? await params : params
    const { fileId } = resolvedParams

    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 })
    }

    // Fetch file from database
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: session.user.id,
        deletedAt: {
          not: null, // Only restore deleted files
        },
      },
      include: {
        parent: true,
      },
    })

    if (!file) {
      return NextResponse.json({ error: "File not found in trash" }, { status: 404 })
    }

    // Recursive function to restore folder and all its children
    const restoreFolderRecursively = async (folderId: string) => {
      // Get all deleted children
      const children = await prisma.file.findMany({
        where: {
          parentId: folderId,
          deletedAt: {
            not: null,
          },
        },
      })

      // Restore all children first
      for (const child of children) {
        if (child.isFolder) {
          // Recursively restore subfolders
          await restoreFolderRecursively(child.id)
        } else {
          // Restore the file
          await prisma.file.update({
            where: { id: child.id },
            data: { deletedAt: null },
          })
        }
      }

      // Finally, restore the folder itself
      await prisma.file.update({
        where: { id: folderId },
        data: { deletedAt: null },
      })
    }

    // Check if parent folder still exists and is not deleted
    // If parent is deleted, restore to root (parentId = null)
    let parentId: string | null = file.parentId

    if (parentId) {
      const parent = await prisma.file.findFirst({
        where: {
          id: parentId,
          userId: session.user.id,
          deletedAt: null,
        },
      })

      // If parent doesn't exist or is deleted, restore to root
      if (!parent) {
        parentId = null
      }
    }

    // If it's a folder, restore recursively
    if (file.isFolder) {
      await restoreFolderRecursively(fileId)
      // Update parent if needed
      if (file.parentId !== parentId) {
        await prisma.file.update({
          where: { id: fileId },
          data: { parentId },
        })
      }
    } else {
      // For files, just restore
      await prisma.file.update({
        where: { id: fileId },
        data: {
          deletedAt: null,
          parentId, // Update parent if needed
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: file.isFolder ? "Folder restored" : "File restored",
    })
  } catch (error) {
    console.error("Error restoring file:", error)
    return NextResponse.json(
      { error: "Failed to restore file" },
      { status: 500 }
    )
  }
}

