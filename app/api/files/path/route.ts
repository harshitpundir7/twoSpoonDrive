import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get("folderId")

    if (!folderId) {
      // Return root path
      return NextResponse.json({ path: [] })
    }

    // Build the path by traversing up the parent chain
    const path: Array<{ id: string; name: string }> = []
    let currentId: string | null = folderId

    while (currentId) {
      // Check if folder exists and user has access (owner or shared)
      const folder: {
        id: string
        name: string
        parentId: string | null
        userId: string
      } | null = await prisma.file.findFirst({
        where: {
          id: currentId,
          isFolder: true,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          parentId: true,
          userId: true,
        },
      })

      if (!folder) {
        break
      }

      // Check if user is owner or has shared access
      const isOwner = folder.userId === session.user.id
      let hasAccess = isOwner

      if (!isOwner && session.user.email) {
        const share = await prisma.fileShare.findFirst({
          where: {
            fileId: currentId,
            OR: [
              { sharedWithUserId: session.user.id },
              { sharedWithEmail: session.user.email.toLowerCase() },
            ],
          },
        })
        hasAccess = !!share
      }

      if (!hasAccess) {
        break
      }

      path.unshift({ id: folder.id, name: folder.name })
      currentId = folder.parentId
    }

    return NextResponse.json({ path })
  } catch (error) {
    console.error("Error fetching folder path:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

