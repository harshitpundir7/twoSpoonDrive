import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getFileTypeCategory, FileTypeCategory } from "@/lib/fileTypes"
import { ModifiedFilterOption } from "@/components/dashboard/ModifiedFilter"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get("type") as FileTypeCategory | null
    const recursive = searchParams.get("recursive") === "true"
    const modifiedFilter = searchParams.get("modified") as ModifiedFilterOption | null

    // Find all files shared with this user (by email or userId)
    const shares = await prisma.fileShare.findMany({
      where: {
        OR: [
          { sharedWithUserId: session.user.id },
          { sharedWithEmail: session.user.email?.toLowerCase() },
        ],
        accessLevel: "restricted", // Only restricted shares (people added to share list)
      },
      include: {
        file: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // Get unique file IDs (in case user has multiple shares for same file)
    const fileIds = [...new Set(shares.map((s) => s.fileId))]

    if (fileIds.length === 0) {
      return NextResponse.json({ files: [] })
    }

    // Build where clause for files
    const where: any = {
      id: { in: fileIds },
      deletedAt: null,
    }

    // Handle modified date filtering
    if (modifiedFilter && modifiedFilter !== "all") {
      const now = new Date()
      let startDate: Date | undefined
      let endDate: Date | undefined

      switch (modifiedFilter) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
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
          startDate = new Date(now.getFullYear() - 1, 0, 1)
          endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
          break
        case "custom":
          break
        default:
          break
      }

      if (startDate) {
        where.updatedAt = {
          gte: startDate,
          ...(endDate && { lte: endDate }),
        }
      }
    }

    // Handle type filtering
    if (typeFilter && typeFilter !== "all") {
      if (typeFilter === "folders") {
        where.isFolder = true
      } else {
        where.isFolder = false
      }
    }

    // Fetch files
    let files = await prisma.file.findMany({
      where,
      orderBy: [
        { isFolder: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    // If type filter is set and not "folders", filter by category
    if (typeFilter && typeFilter !== "all" && typeFilter !== "folders") {
      files = files.filter((file) => {
        if (file.isFolder) return false
        return getFileTypeCategory(file.type) === typeFilter
      })
    }

    // Map files to include owner info
    const filesWithOwner = files.map((file) => ({
      id: file.id,
      name: file.name,
      type: file.type,
      isFolder: file.isFolder,
      size: file.size,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
      ownerName: file.user.name || file.user.email,
      ownerEmail: file.user.email,
    }))

    return NextResponse.json({ files: filesWithOwner })
  } catch (error) {
    console.error("Error fetching shared files:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

