import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { s3Client, S3_BUCKET_NAME, generateS3Key, getFileExtension } from "@/lib/s3"
import { CopyObjectCommand } from "@aws-sdk/client-s3"
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"

// Helper function to generate next available name with numeric suffix
function generateNextAvailableName(
  baseName: string,
  existingNames: string[],
  isFolder: boolean
): string {
  // Extract name and extension
  let nameWithoutExt = baseName
  let extension = ""

  if (!isFolder) {
    const lastDotIndex = baseName.lastIndexOf(".")
    if (lastDotIndex > 0) {
      nameWithoutExt = baseName.substring(0, lastDotIndex)
      extension = baseName.substring(lastDotIndex)
    }
  }

  // Check if base name already exists
  const fullName = isFolder ? nameWithoutExt : nameWithoutExt + extension
  if (!existingNames.includes(fullName)) {
    return fullName
  }

  // Find next available number
  let counter = 1
  while (true) {
    const newName = isFolder
      ? `${nameWithoutExt} (${counter})`
      : `${nameWithoutExt} (${counter})${extension}`
    
    if (!existingNames.includes(newName)) {
      return newName
    }
    counter++
    
    // Safety limit
    if (counter > 1000) {
      // Fallback: use timestamp
      const timestamp = Date.now()
      return isFolder
        ? `${nameWithoutExt} (${timestamp})`
        : `${nameWithoutExt} (${timestamp})${extension}`
    }
  }
}

export async function POST(
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

    if (!fileId) {
      return NextResponse.json({ error: "File ID is required" }, { status: 400 })
    }

    // Fetch original file/folder
    const originalFile = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: session.user.id,
        deletedAt: null,
      },
    })

    if (!originalFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Check storage limit before duplicating
    // For files, we need to check if duplicating would exceed storage limit
    if (!originalFile.isFolder) {
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
      const fileSize = originalFile.size || 0
      const newTotalStorage = currentStorageUsed + fileSize

      if (newTotalStorage > STORAGE_LIMIT_BYTES) {
        const remainingBytes = STORAGE_LIMIT_BYTES - currentStorageUsed
        const remainingGB = (remainingBytes / (1024 * 1024 * 1024)).toFixed(2)
        return NextResponse.json(
          {
            error: `Storage limit exceeded. You have ${remainingGB} GB remaining. Cannot duplicate file.`,
          },
          { status: 413 } // 413 Payload Too Large
        )
      }
    }

    // Get all existing names in the same parent folder
    const existingFiles = await prisma.file.findMany({
      where: {
        userId: session.user.id,
        parentId: originalFile.parentId,
        isFolder: originalFile.isFolder,
        deletedAt: null,
      },
      select: {
        name: true,
      },
    })

    const existingNames = existingFiles.map((f) => f.name)

    // Generate new name with numeric suffix
    const newName = generateNextAvailableName(
      originalFile.name,
      existingNames,
      originalFile.isFolder
    )

    // Recursive function to copy folder and all its children
    const copyFolderRecursively = async (
      sourceFolderId: string,
      targetParentId: string | null
    ): Promise<string> => {
      // Get source folder
      const sourceFolder = await prisma.file.findFirst({
        where: {
          id: sourceFolderId,
          userId: session.user.id,
          deletedAt: null,
        },
      })

      if (!sourceFolder) {
        throw new Error("Source folder not found")
      }

      // Get existing names in target parent
      const targetExistingFiles = await prisma.file.findMany({
        where: {
          userId: session.user.id,
          parentId: targetParentId,
          isFolder: true,
          deletedAt: null,
        },
        select: {
          name: true,
        },
      })

      const targetExistingNames = targetExistingFiles.map((f) => f.name)

      // Generate name for copied folder
      const folderCopyName = generateNextAvailableName(
        sourceFolder.name,
        targetExistingNames,
        true
      )

      // Create new folder
      const newFolderId = randomUUID()
      const newFolder = await prisma.file.create({
        data: {
          id: newFolderId,
          name: folderCopyName,
          type: "folder",
          size: 0,
          path: null,
          storageType: "local",
          userId: session.user.id,
          parentId: targetParentId,
          isFolder: true,
        },
      })

      // Get all children of source folder
      const children = await prisma.file.findMany({
        where: {
          parentId: sourceFolderId,
          userId: session.user.id,
          deletedAt: null,
        },
      })

      // Copy all children
      for (const child of children) {
        if (child.isFolder) {
          // Recursively copy subfolders
          await copyFolderRecursively(child.id, newFolderId)
        } else {
          // Copy file
          await copyFile(child.id, newFolderId)
        }
      }

      return newFolderId
    }

    // Function to copy a file
    const copyFile = async (
      sourceFileId: string,
      targetParentId: string | null
    ): Promise<string> => {
      const sourceFile = await prisma.file.findFirst({
        where: {
          id: sourceFileId,
          userId: session.user.id,
          deletedAt: null,
        },
      })

      if (!sourceFile || !sourceFile.path) {
        throw new Error("Source file not found or has no path")
      }

      // Get existing names in target parent
      const targetExistingFiles = await prisma.file.findMany({
        where: {
          userId: session.user.id,
          parentId: targetParentId,
          isFolder: false,
          deletedAt: null,
        },
        select: {
          name: true,
        },
      })

      const targetExistingNames = targetExistingFiles.map((f) => f.name)

      // Generate name for copied file
      const fileCopyName = generateNextAvailableName(
        sourceFile.name,
        targetExistingNames,
        false
      )

      // Generate new file ID and S3 key
      const newFileId = randomUUID()
      const extension = getFileExtension(sourceFile.name)
      const newS3Key = generateS3Key(session.user.id, newFileId, extension)

      // Copy file in S3
      if (sourceFile.storageType === "s3") {
        try {
          const copyCommand = new CopyObjectCommand({
            Bucket: S3_BUCKET_NAME,
            CopySource: `${S3_BUCKET_NAME}/${sourceFile.path}`,
            Key: newS3Key,
            ContentType: sourceFile.type,
            MetadataDirective: "REPLACE",
            Metadata: {
              userid: session.user.id,
              fileid: newFileId,
              originalname: fileCopyName.substring(0, 255),
            },
          })

          await s3Client.send(copyCommand)
        } catch (s3Error) {
          console.error("Error copying file in S3:", s3Error)
          throw new Error("Failed to copy file in storage")
        }
      }

      // Create new file record
      const newFile = await prisma.file.create({
        data: {
          id: newFileId,
          name: fileCopyName,
          type: sourceFile.type,
          size: sourceFile.size,
          path: newS3Key,
          storageType: sourceFile.storageType,
          userId: session.user.id,
          parentId: targetParentId,
          isFolder: false,
        },
      })

      return newFileId
    }

    // Copy the file/folder
    let newFileId: string

    if (originalFile.isFolder) {
      newFileId = await copyFolderRecursively(originalFile.id, originalFile.parentId)
    } else {
      newFileId = await copyFile(originalFile.id, originalFile.parentId)
    }

    // Fetch the newly created file/folder
    const newFile = await prisma.file.findFirst({
      where: {
        id: newFileId,
      },
    })

    return NextResponse.json({
      success: true,
      file: {
        id: newFile?.id,
        name: newFile?.name,
        type: newFile?.type,
        isFolder: newFile?.isFolder,
      },
    })
  } catch (error) {
    console.error("Error duplicating file:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to duplicate file" },
      { status: 500 }
    )
  }
}

