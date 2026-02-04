import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { s3Client, S3_BUCKET_NAME, generateS3Key, getFileExtension } from "@/lib/s3"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const parentId = formData.get("parentId") as string | null

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    // Check storage limit before upload
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
    const newTotalStorage = currentStorageUsed + file.size

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
        name: file.name.trim(),
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
    const extension = getFileExtension(file.name)
    const s3Key = generateS3Key(session.user.id, fileId, extension)

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: s3Key,
      ContentType: file.type || "application/octet-stream",
      Body: buffer,
      Metadata: {
        userid: session.user.id,
        fileid: fileId,
        originalname: file.name.trim().substring(0, 255),
      },
    })

    await s3Client.send(command)

    // Create file record in database
    const dbFile = await prisma.file.create({
      data: {
        id: fileId,
        name: file.name.trim(),
        type: file.type || "application/octet-stream",
        size: file.size,
        path: s3Key,
        storageType: "s3",
        userId: session.user.id,
        parentId: parentId || null,
        isFolder: false,
      },
    })

    return NextResponse.json({
      success: true,
      file: {
        id: dbFile.id,
        name: dbFile.name,
        type: dbFile.type,
        size: dbFile.size,
        createdAt: dbFile.createdAt,
      },
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Failed to upload file: ${errorMessage}` },
      { status: 500 }
    )
  }
}

