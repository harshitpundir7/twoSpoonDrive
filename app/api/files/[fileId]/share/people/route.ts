import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { randomBytes } from "crypto"

/**
 * POST /api/files/[fileId]/share/people
 * Add people to share with
 */
export async function POST(
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
    const { emails, permission } = body

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "Emails are required" }, { status: 400 })
    }

    if (!permission || !["viewer", "commenter", "editor"].includes(permission)) {
      return NextResponse.json({ error: "Invalid permission" }, { status: 400 })
    }

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

    // Ensure there's a share with token (for the link)
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
          accessLevel: "restricted",
          permission: permission || "viewer",
          token: token,
        },
      })
    }

    // Add shares for each email
    const results = []
    for (const email of emails) {
      if (!email || typeof email !== "string") continue

      // Find user by email
      const sharedUser = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      })

      // Check if share already exists
      const existingShare = await prisma.fileShare.findFirst({
        where: {
          fileId: fileId,
          OR: [
            { sharedWithUserId: sharedUser?.id },
            { sharedWithEmail: email.trim().toLowerCase() },
          ],
          accessLevel: "restricted",
        },
      })

      if (existingShare) {
        // Update existing share
        await prisma.fileShare.update({
          where: { id: existingShare.id },
          data: {
            permission: permission,
            sharedWithUserId: sharedUser?.id || null,
            sharedWithEmail: sharedUser ? null : email.trim().toLowerCase(),
          },
        })
        results.push({ email, status: "updated" })
      } else {
        // Create new share
        await prisma.fileShare.create({
          data: {
            fileId: fileId,
            userId: session.user.id,
            sharedWithUserId: sharedUser?.id || null,
            sharedWithEmail: sharedUser ? null : email.trim().toLowerCase(),
            permission: permission,
            accessLevel: "restricted",
          },
        })
        results.push({ email, status: "added" })
      }
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error("Error adding people to share:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

