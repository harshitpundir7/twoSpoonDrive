import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { s3Client, S3_BUCKET_NAME, generateS3Key, getFileExtension } from "@/lib/s3"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { fileName, fileSize, mimeType, parentId } = body

    // Validate input
    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json({ error: "File name is required" }, { status: 400 })
    }

    if (!fileSize || typeof fileSize !== "number" || fileSize <= 0) {
      return NextResponse.json({ error: "Valid file size is required" }, { status: 400 })
    }

    if (!mimeType || typeof mimeType !== "string") {
      return NextResponse.json({ error: "MIME type is required" }, { status: 400 })
    }

    // Check storage limit before generating upload URL
    const STORAGE_LIMIT_BYTES = 15 * 1024 * 1024 * 1024 // 15 GB
    const storageStats = await prisma.file.aggregate({
      where: {
        userId: session.user.id,
        deletedAt: null,
        isFolder: false,
      },
      _sum: {
        size: true,
      },
    })

    const currentStorageUsed = storageStats._sum.size || 0
    const newTotalStorage = currentStorageUsed + fileSize

    if (newTotalStorage > STORAGE_LIMIT_BYTES) {
      const remainingBytes = STORAGE_LIMIT_BYTES - currentStorageUsed
      const remainingGB = (remainingBytes / (1024 * 1024 * 1024)).toFixed(2)
      return NextResponse.json(
        {
          error: `Storage limit exceeded. You have ${remainingGB} GB remaining. Please delete some files or upgrade your storage plan.`,
        },
        { status: 413 } // 413 Payload Too Large
      )
    }

    // Validate parent folder if provided
    if (parentId) {
      const parent = await prisma.file.findFirst({
        where: {
          id: parentId,
          userId: session.user.id,
          isFolder: true,
          deletedAt: null,
        },
      })

      if (!parent) {
        return NextResponse.json({ error: "Parent folder not found" }, { status: 404 })
      }
    }

    // Check if file with same name already exists in the same parent
    const existing = await prisma.file.findFirst({
      where: {
        userId: session.user.id,
        parentId: parentId || null,
        name: fileName.trim(),
        isFolder: false,
        deletedAt: null,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "A file with this name already exists" },
        { status: 409 }
      )
    }

    // Generate unique file ID and S3 key
    const fileId = randomUUID()
    const extension = getFileExtension(fileName)
    const s3Key = generateS3Key(session.user.id, fileId, extension)

    // Create file record in database first (before upload)
    const file = await prisma.file.create({
      data: {
        id: fileId,
        name: fileName.trim(),
        type: mimeType,
        size: fileSize,
        path: s3Key,
        storageType: "s3",
        userId: session.user.id,
        parentId: parentId || null,
        isFolder: false,
      },
    })

    // Generate presigned PUT URL for upload
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      ContentType: mimeType,
      // Add metadata (S3 metadata keys must be lowercase)
      Metadata: {
        userid: session.user.id,
        fileid: fileId,
        originalname: fileName.trim().substring(0, 255), // S3 metadata value limit
      },
    })

    // Generate signed URL (expires in 5 minutes)
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300, // 5 minutes
    })

    console.log(`Generated upload URL for file: ${fileName}, S3 key: ${s3Key}`)

    return NextResponse.json({
      uploadUrl,
      fileId: file.id,
      s3Key,
    })
  } catch (error) {
    console.error("Error generating upload URL:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Failed to generate upload URL: ${errorMessage}` },
      { status: 500 }
    )
  }
}

