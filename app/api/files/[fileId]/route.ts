import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { s3Client, S3_BUCKET_NAME } from "@/lib/s3"
import { DeleteObjectCommand } from "@aws-sdk/client-s3"
import { NextResponse } from "next/server"

export async function PATCH(
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

    const body = await request.json()
    const { name, parentId } = body

    // Handle move operation (parentId change)
    if (parentId !== undefined) {
      // Fetch file first to check its current state
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

      // If parentId is the same as current parentId, no move needed
      if (file.parentId === (parentId || null)) {
        return NextResponse.json({
          success: true,
          message: file.isFolder ? "Folder already in target location" : "File already in target location",
        })
      }

      // Validate that we're not moving a folder into itself or its descendants
      if (parentId) {
        // Check if parentId is the same as fileId (can't move folder into itself)
        if (parentId === fileId) {
          return NextResponse.json(
            { error: "Cannot move a folder into itself" },
            { status: 400 }
          )
        }

        // Check if parentId is a descendant of fileId (can't move folder into its child)
        const checkDescendant = async (folderId: string, targetId: string): Promise<boolean> => {
          const children = await prisma.file.findMany({
            where: {
              parentId: folderId,
              userId: session.user.id,
              isFolder: true,
              deletedAt: null,
            },
            select: { id: true },
          })

          for (const child of children) {
            if (child.id === targetId) {
              return true
            }
            if (await checkDescendant(child.id, targetId)) {
              return true
            }
          }
          return false
        }

        if (file.isFolder && (await checkDescendant(fileId, parentId))) {
          return NextResponse.json(
            { error: "Cannot move a folder into its own subfolder" },
            { status: 400 }
          )
        }

        // Validate parent folder exists and is a folder
        const parent = await prisma.file.findFirst({
          where: {
            id: parentId,
            userId: session.user.id,
            isFolder: true,
            deletedAt: null,
          },
        })

        if (!parent) {
          return NextResponse.json(
            { error: "Target folder not found" },
            { status: 404 }
          )
        }
      }

      // Check for duplicate name in target folder
      const existing = await prisma.file.findFirst({
        where: {
          userId: session.user.id,
          parentId: parentId || null,
          name: file.name,
          isFolder: file.isFolder,
          deletedAt: null,
          id: {
            not: fileId,
          },
        },
      })

      if (existing) {
        return NextResponse.json(
          {
            error: file.isFolder
              ? "A folder with this name already exists in the target location"
              : "A file with this name already exists in the target location",
          },
          { status: 409 }
        )
      }

      // Update parentId
      await prisma.file.update({
        where: { id: fileId },
        data: { parentId: parentId || null },
      })

      return NextResponse.json({
        success: true,
        message: file.isFolder ? "Folder moved" : "File moved",
      })
    }

    // Handle rename operation (name change)
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const trimmedName = name.trim()

    // Fetch file from database
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: session.user.id,
        deletedAt: null, // Only rename non-deleted files
      },
    })

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // If name hasn't changed, return success
    if (file.name === trimmedName) {
      return NextResponse.json({
        success: true,
        file: {
          id: file.id,
          name: file.name,
        },
      })
    }

    // Check if file/folder with same name already exists in the same parent
    const existing = await prisma.file.findFirst({
      where: {
        userId: session.user.id,
        parentId: file.parentId,
        name: trimmedName,
        isFolder: file.isFolder,
        deletedAt: null,
        id: {
          not: fileId, // Exclude the current file
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        {
          error: file.isFolder
            ? "A folder with this name already exists"
            : "A file with this name already exists",
        },
        { status: 409 }
      )
    }

    // Update the file/folder name
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: { name: trimmedName },
    })

    return NextResponse.json({
      success: true,
      file: {
        id: updatedFile.id,
        name: updatedFile.name,
      },
    })
  } catch (error) {
    console.error("Error renaming file:", error)
    return NextResponse.json(
      { error: "Failed to rename file" },
      { status: 500 }
    )
  }
}

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

    // Fetch file from database
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: session.user.id,
        deletedAt: null, // Only delete non-deleted files
      },
      include: {
        children: {
          where: {
            deletedAt: null,
          },
        },
      },
    })

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Recursive function to soft delete folder and all its children
    const deleteFolderRecursively = async (folderId: string) => {
      if (!folderId) {
        console.error("deleteFolderRecursively called with undefined folderId")
        return
      }

      // Get all children (files and folders)
      const children = await prisma.file.findMany({
        where: {
          parentId: folderId,
          deletedAt: null,
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
          await deleteFolderRecursively(child.id)
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
              console.error(`Error deleting file ${child.id} from S3:`, s3Error)
            }
          }
          // Soft delete the file
          await prisma.file.update({
            where: { id: child.id },
            data: { deletedAt: new Date() },
          })
        }
      }

      // Finally, delete the folder itself (folders don't have S3 paths)
      await prisma.file.update({
        where: { id: folderId },
        data: { deletedAt: new Date() },
      })
    }

    // If it's a folder, delete recursively (includes the folder itself)
    if (file.isFolder) {
      await deleteFolderRecursively(fileId)
    } else {
      // For files, soft delete and remove from S3
      await prisma.file.update({
        where: { id: fileId },
        data: { deletedAt: new Date() },
      })

      // Delete file from S3
      if (file.path && file.storageType === "s3") {
        try {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: file.path,
          })
          await s3Client.send(deleteCommand)
        } catch (s3Error) {
          console.error("Error deleting file from S3:", s3Error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: file.isFolder ? "Folder moved to trash" : "File moved to trash",
    })
  } catch (error) {
    console.error("Error deleting file:", error)
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    )
  }
}

