import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { NextResponse } from "next/server"

/**
 * GET /api/shared/[token]/download
 * Download file by share token (PUBLIC - no authentication required)
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

    // If access level is "anyone", allow download
    if (share.accessLevel === "anyone") {
      // Check permission - only viewer and above can download
      if (!["viewer", "commenter", "editor"].includes(share.permission)) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
      }
    } else if (share.accessLevel === "restricted") {
      // Get session from request
      const session = await auth()

      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Sorry, unable to open the file at present. Please check the address and try again." },
          { status: 403 }
        )
      }

      // Check if user is the owner
      if (share.userId === session.user.id) {
        // Owner can download
      } else {
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

        // Check permission - only viewer and above can download
        if (!["viewer", "commenter", "editor"].includes(userShare.permission)) {
          return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
        }
      }
    } else {
      return NextResponse.json(
        { error: "Sorry, unable to open the file at present. Please check the address and try again." },
        { status: 403 }
      )
    }

    // Verify it's a file, not a folder
    if (share.file.isFolder) {
      return NextResponse.json({ error: "Cannot download folders" }, { status: 400 })
    }

    // Verify file has a path
    if (!share.file.path || share.file.storageType !== "s3") {
      return NextResponse.json({ error: "File not found in storage" }, { status: 404 })
    }

    // Fetch file from S3
    try {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: share.file.path,
      })

      const response = await s3Client.send(command)

      if (!response.Body) {
        return NextResponse.json({ error: "File not found in storage" }, { status: 404 })
      }

      // Convert S3 stream to ReadableStream for Next.js (same as authenticated download)
      const stream = response.Body.transformToWebStream()

      // Return file with proper download headers
      // Escape quotes in filename for Content-Disposition header
      const safeFilename = share.file.name.replace(/"/g, '\\"')
      return new NextResponse(stream, {
        headers: {
          "Content-Type": share.file.type || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${safeFilename}"`,
          "Content-Length": share.file.size.toString(),
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      })
    } catch (s3Error) {
      console.error("Error fetching file from S3:", s3Error)
      return NextResponse.json(
        { error: "Failed to fetch file from storage" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error downloading shared file:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

