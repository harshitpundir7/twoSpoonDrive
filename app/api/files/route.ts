import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

import { getFileTypeCategory, FileTypeCategory } from "@/lib/fileTypes"

// Recursive function to get all descendant folder IDs
async function getDescendantFolderIds(
  parentId: string | null,
  userId: string,
  isShared: boolean = false
): Promise<string[]> {
  const whereClause: any = {
    parentId: parentId,
    isFolder: true,
    deletedAt: null,
  }

  // If not shared, only get user's folders
  if (!isShared) {
    whereClause.userId = userId
  }

  const folders = await prisma.file.findMany({
    where: whereClause,
    select: {
      id: true,
    },
  })

  const folderIds = folders.map((f) => f.id)
  const allIds = [...folderIds]

  // Recursively get children
  for (const folderId of folderIds) {
    const childIds = await getDescendantFolderIds(folderId, userId, isShared)
    allIds.push(...childIds)
  }

  return allIds
}

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get("parentId") || null
    const typeFilter = searchParams.get("type") as FileTypeCategory | null
    const recursive = searchParams.get("recursive") === "true"
    const modifiedFilter = searchParams.get("modified") as string | null

    // If parentId is provided, check if it's a shared folder
    let isSharedFolder = false
    if (parentId) {
      // Check if user has access to this folder (either owner or shared)
      const folder = await prisma.file.findFirst({
        where: {
          id: parentId,
          isFolder: true,
          deletedAt: null,
        },
      })

      if (folder) {
        // Check if user is owner
        if (folder.userId === session.user.id) {
          isSharedFolder = false
        } else {
          // Check if folder is shared with user
          const share = await prisma.fileShare.findFirst({
            where: {
              fileId: parentId,
              OR: [
                { sharedWithUserId: session.user.id },
                { sharedWithEmail: session.user.email.toLowerCase() },
              ],
            },
          })
          isSharedFolder = !!share
        }
      }
    }

    // Build where clause - include owned files OR files in shared folders
    const where: any = {
      deletedAt: null,
    }

    // Handle parent folder filtering
    if (recursive && parentId) {
      // Get all descendant folder IDs
      const descendantIds = await getDescendantFolderIds(parentId, session.user.id, isSharedFolder)
      // Include files in parent folder and all descendant folders
      where.parentId = {
        in: [parentId, ...descendantIds],
      }
      // For owned folders, also filter by userId
      if (!isSharedFolder) {
        where.userId = session.user.id
      }
    } else if (parentId) {
      // Only direct children
      where.parentId = parentId
      // For owned folders, also filter by userId
      if (!isSharedFolder) {
        where.userId = session.user.id
      }
    } else if (!recursive) {
      // Root level only - always user's files
      where.parentId = null
      where.userId = session.user.id
    } else {
      // Recursive search without parentId - all user's files
      where.userId = session.user.id
    }

    // Handle modified date filtering
    if (modifiedFilter && modifiedFilter !== "all") {
      const now = new Date()
      let startDate: Date | undefined

      switch (modifiedFilter) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case "last7days":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "last30days":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case "thisyear":
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        case "lastyear":
          const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
          const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
          where.updatedAt = {
            gte: lastYearStart,
            lte: lastYearEnd,
          }
          break
        case "custom":
          // For custom date range, we'd need start and end dates from query params
          // For now, skip filtering (can be implemented later)
          break
        default:
          break
      }

      if (startDate && modifiedFilter !== "lastyear" && modifiedFilter !== "custom") {
        where.updatedAt = {
          gte: startDate,
        }
      }
    }

    // Handle type filtering
    if (typeFilter && typeFilter !== "all") {
      if (typeFilter === "folders") {
        where.isFolder = true
      } else {
        // Filter by MIME type category
        where.isFolder = false

        // Get all files first, then filter by category in memory
        // (Prisma doesn't support complex MIME type matching)
        const allFiles = await prisma.file.findMany({
          where,
          orderBy: [
            { isFolder: "desc" },
            { createdAt: "desc" },
          ],
        })

        // Filter by file type category
        // Note: typeFilter cannot be "folders" here due to the if check above
        const filteredFiles = allFiles.filter((file) => {
          // Exclude folders when filtering for specific file types
          if (file.isFolder) {
            return false
          }
          return getFileTypeCategory(file.type) === typeFilter
        })

        return NextResponse.json({ files: filteredFiles })
      }
    }

    // Fetch files
    const files = await prisma.file.findMany({
      where,
      orderBy: [
        { isFolder: "desc" }, // Folders first
        { createdAt: "desc" }, // Then by creation date
      ],
    })

    // If type filter is set and not "folders", filter by category
    if (typeFilter && typeFilter !== "all" && typeFilter !== "folders") {
      const filteredFiles = files.filter((file) => {
        if (file.isFolder) return false
        return getFileTypeCategory(file.type) === typeFilter
      })
      return NextResponse.json({ files: filteredFiles })
    }

    return NextResponse.json({ files })
  } catch (error) {
    console.error("Error fetching files:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

