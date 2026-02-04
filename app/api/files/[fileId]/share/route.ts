import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { randomBytes } from "crypto"

const STORAGE_LIMIT_BYTES = 15 * 1024 * 1024 * 1024 // 15 GB

/**
 * GET /api/files/[fileId]/share
 * Get share information for a file
 */
export async function GET(
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

    // Get file and verify ownership
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

    // Get all shares for this file
    const shares = await prisma.fileShare.findMany({
      where: {
        fileId: fileId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Find share with token (can be restricted or anyone)
    const shareWithToken = shares.find((s) => s.token)
    const shareLink = shareWithToken?.token
      ? `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/shared/${shareWithToken.token}`
      : null

    // Get people with access (excluding public share)
    const peopleShares = shares.filter((s) => s.accessLevel === "restricted" && (s.sharedWithUserId || s.sharedWithEmail))

    // Get user info for people with access
    const people = await Promise.all(
      peopleShares.map(async (share) => {
        let sharedUser = null
        if (share.sharedWithUserId) {
          sharedUser = await prisma.user.findUnique({
            where: { id: share.sharedWithUserId },
            select: {
              id: true,
              name: true,
              email: true,
            },
          })
        }

        return {
          id: share.id,
          email: sharedUser?.email || share.sharedWithEmail || "",
          name: sharedUser?.name || share.sharedWithEmail || "Unknown",
          permission: share.permission,
          isOwner: false,
        }
      })
    )

    // Add owner
    const owner = {
      id: "owner",
      email: session.user.email || "",
      name: session.user.name || session.user.email || "You",
      permission: "editor" as const,
      isOwner: true,
    }

    // Determine current access level and permission
    const accessLevel = shareWithToken?.accessLevel || "restricted"
    const permission = shareWithToken?.permission || shares[0]?.permission || "viewer"

    return NextResponse.json({
      accessLevel,
      permission,
      shareLink,
      people: [owner, ...people],
    })
  } catch (error) {
    console.error("Error fetching share info:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/files/[fileId]/share
 * Update share settings (access level and permission)
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
    const { accessLevel, permission } = body

    // Validate file ownership
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

    // Validate inputs
    if (accessLevel && !["restricted", "anyone"].includes(accessLevel)) {
      return NextResponse.json({ error: "Invalid access level" }, { status: 400 })
    }

    if (permission && !["viewer", "commenter", "editor"].includes(permission)) {
      return NextResponse.json({ error: "Invalid permission" }, { status: 400 })
    }

    // Find or create share with token (same token for both restricted and anyone)
    let shareWithToken = await prisma.fileShare.findFirst({
      where: {
        fileId: fileId,
        token: { not: null },
      },
    })

    if (!shareWithToken) {
      // Generate unique token for share link (first time sharing)
      const token = randomBytes(32).toString("hex")
      shareWithToken = await prisma.fileShare.create({
        data: {
          fileId: fileId,
          userId: session.user.id,
          accessLevel: accessLevel || "restricted",
          permission: permission || "viewer",
          token: token,
        },
      })
    } else {
      // Update existing share (keep same token, just change access level and permission)
      shareWithToken = await prisma.fileShare.update({
        where: { id: shareWithToken.id },
        data: {
          accessLevel: accessLevel || shareWithToken.accessLevel,
          permission: permission || shareWithToken.permission,
        },
      })
    }

    const shareLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/shared/${shareWithToken.token}`

    return NextResponse.json({
      success: true,
      accessLevel: shareWithToken.accessLevel,
      permission: shareWithToken.permission,
      shareLink,
    })

    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  } catch (error) {
    console.error("Error updating share:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

