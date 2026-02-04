import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { NextResponse } from "next/server"

/**
 * GET /api/shared/[token]
 * Get file information by share token (PUBLIC - no authentication required)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const { token } = resolvedParams

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    // Find share by token
    const share = await prisma.fileShare.findUnique({
      where: {
        token: token,
      },
      include: {
        file: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!share) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 })
    }

    // Check if share is expired
    if (share.expiresAt && share.expiresAt < new Date()) {
      return NextResponse.json({ error: "This link has expired" }, { status: 410 })
    }

    // Verify file exists and is not deleted
    if (share.file.deletedAt) {
      return NextResponse.json({ error: "This file has been deleted" }, { status: 404 })
    }

    // If access level is "anyone", allow access
    if (share.accessLevel === "anyone") {
      return NextResponse.json({
        id: share.file.id,
        name: share.file.name,
        type: share.file.type,
        isFolder: share.file.isFolder,
        size: share.file.size,
        permission: share.permission,
        ownerName: share.user.name || share.user.email,
      })
    }

    // If access level is "restricted", check if user is authenticated and in share list
    if (share.accessLevel === "restricted") {
      // Get session from request headers/cookies
      const session = await auth()

      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Sorry, unable to open the file at present. Please check the address and try again." },
          { status: 403 }
        )
      }

      // Check if user is the owner
      if (share.userId === session.user.id) {
        return NextResponse.json({
          id: share.file.id,
          name: share.file.name,
          type: share.file.type,
          isFolder: share.file.isFolder,
          size: share.file.size,
          permission: share.permission,
          ownerName: share.user.name || share.user.email,
        })
      }

      // Check if user is in the share list
      const userShare = await prisma.fileShare.findFirst({
        where: {
          fileId: share.fileId,
          OR: [
            { sharedWithUserId: session.user.id },
            { sharedWithEmail: session.user.email },
          ],
        },
      })

      if (!userShare) {
        return NextResponse.json(
          { error: "Sorry, unable to open the file at present. Please check the address and try again." },
          { status: 403 }
        )
      }

      // User has access
      return NextResponse.json({
        id: share.file.id,
        name: share.file.name,
        type: share.file.type,
        isFolder: share.file.isFolder,
        size: share.file.size,
        permission: userShare.permission,
        ownerName: share.user.name || share.user.email,
      })
    }

    // Unknown access level
    return NextResponse.json(
      { error: "Sorry, unable to open the file at present. Please check the address and try again." },
      { status: 403 }
    )
  } catch (error) {
    console.error("Error fetching shared file:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

