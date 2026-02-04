import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> | { fileId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { fileId } = resolvedParams

    // Fetch file from database
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        isFolder: false,
        deletedAt: null,
      },
    })

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Check if user is owner
    const isOwner = file.userId === session.user.id

    // If not owner, check if file is shared with user
    if (!isOwner) {
      const share = await prisma.fileShare.findFirst({
        where: {
          fileId: fileId,
          OR: [
            { sharedWithUserId: session.user.id },
            { sharedWithEmail: session.user.email.toLowerCase() },
          ],
        },
      })

      if (!share) {
        return NextResponse.json({ error: "File not found" }, { status: 404 })
      }

      // Check permission - only viewer and above can download
      if (!["viewer", "commenter", "editor"].includes(share.permission)) {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
      }
    }

    if (!file.path) {
      return NextResponse.json(
        { error: "File path not found" },
        { status: 404 }
      )
    }

    // Update lastAccessedAt for owner's files
    if (isOwner) {
      await prisma.file.update({
        where: { id: fileId },
        data: { lastAccessedAt: new Date() },
      }).catch((err) => {
        // Don't fail the download if this update fails
        console.error("Error updating lastAccessedAt:", err)
      })
    }

    // Get object from S3
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: file.path,
    })

    try {
      const response = await s3Client.send(command)

      if (!response.Body) {
        return NextResponse.json(
          { error: "File not found in storage" },
          { status: 404 }
        )
      }

      // Convert S3 stream to ReadableStream for Next.js
      const stream = response.Body.transformToWebStream()

      // Return file with proper download headers
      // Escape quotes in filename for Content-Disposition header
      const safeFilename = file.name.replace(/"/g, '\\"')
      return new NextResponse(stream, {
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "Content-Disposition": `attachment; filename="${safeFilename}"`,
          "Content-Length": file.size.toString(),
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
    console.error("Error downloading file:", error)
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    )
  }
}

