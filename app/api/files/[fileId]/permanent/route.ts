import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { NextResponse } from "next/server"

export async function DELETE(
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

    // Fetch file from database (must be deleted)
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: session.user.id,
        deletedAt: {
          not: null, // Only permanently delete files that are already in trash
        },
      },
    })

    if (!file) {
      return NextResponse.json({ error: "File not found in trash" }, { status: 404 })
    }

    // Recursive function to permanently delete folder and all its children
    const deleteFolderPermanently = async (folderId: string) => {
      // Get all deleted children
      const children = await prisma.file.findMany({
        where: {
          parentId: folderId,
          deletedAt: {
            not: null,
          },
        },
        select: {
          id: true,
          isFolder: true,
          path: true,
          storageType: true,
        },
      })

      // Delete all children first
      for (const child of children) {
        if (!child.id) {
          console.error("Child found without id, skipping")
          continue
        }

        if (child.isFolder) {
          // Recursively delete subfolders
          await deleteFolderPermanently(child.id)
        } else {
          // Delete file from S3 if it exists
          if (child.path && child.storageType === "s3") {
            try {
              const deleteCommand = new DeleteObjectCommand({
                Bucket: S3_BUCKET_NAME,
                Key: child.path,
              })
              await s3Client.send(deleteCommand)
            } catch (s3Error) {
              console.error(`Error permanently deleting file ${child.id} from S3:`, s3Error)
            }
          }
          // Permanently delete the file from database
          await prisma.file.delete({
            where: { id: child.id },
          })
        }
      }

      // Finally, permanently delete the folder itself
      await prisma.file.delete({
        where: { id: folderId },
      })
    }

    // If it's a folder, delete recursively
    if (file.isFolder) {
      await deleteFolderPermanently(fileId)
    } else {
      // For files, delete from S3 and database
      if (file.path && file.storageType === "s3") {
        try {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: file.path,
          })
          await s3Client.send(deleteCommand)
        } catch (s3Error) {
          console.error("Error permanently deleting file from S3:", s3Error)
        }
      }

      // Permanently delete from database
      await prisma.file.delete({
        where: { id: fileId },
      })
    }

    return NextResponse.json({
      success: true,
      message: file.isFolder ? "Folder permanently deleted" : "File permanently deleted",
    })
  } catch (error) {
    console.error("Error permanently deleting file:", error)
    return NextResponse.json(
      { error: "Failed to permanently delete file" },
      { status: 500 }
    )
  }
}

