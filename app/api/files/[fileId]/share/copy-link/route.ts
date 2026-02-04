import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { randomBytes } from "crypto"

/**
 * POST /api/files/[fileId]/share/copy-link
 * Generate or get share link and return it
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

    // Find existing share with token (can be restricted or anyone)
    const shareWithToken = await prisma.fileShare.findFirst({
      where: {
        fileId: fileId,
        token: { not: null },
      },
    })

    if (!shareWithToken || !shareWithToken.token) {
      return NextResponse.json(
        { error: "Sorry, unable to open the file at present. Please check the address and try again." },
        { status: 404 }
      )
    }

    const shareLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/shared/${shareWithToken.token}`

    return NextResponse.json({
      success: true,
      shareLink,
    })
  } catch (error) {
    console.error("Error generating share link:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

