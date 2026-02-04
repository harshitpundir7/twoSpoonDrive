import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { NextResponse } from "next/server"

export async function GET(
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

    // Fetch file from database
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: session.user.id,
        isFolder: false,
        deletedAt: null,
      },
    })

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    if (!file.path) {
      return NextResponse.json(
        { error: "File path not found" },
        { status: 404 }
      )
    }

    // Check if file is shared (future: implement sharing permissions)
    // For now, only owner can download

    // Generate presigned GET URL for download
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: file.path,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(file.name)}"`,
    })

    // Generate signed URL (expires in 1 hour)
    const downloadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    })

    return NextResponse.json({
      downloadUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    })
  } catch (error) {
    console.error("Error generating download URL:", error)
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    )
  }
}

