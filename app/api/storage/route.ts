import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/**
 * STORAGE STATISTICS API
 * 
 * Calculates the total storage used by a user.
 * Only counts non-deleted files (folders have size 0).
 * 
 * SECURITY:
 * - Requires authentication
 * - Only returns data for the authenticated user
 * - Uses database aggregation for efficient calculation
 */
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const STORAGE_LIMIT_BYTES = 15 * 1024 * 1024 * 1024 // 15 GB in bytes

    // Calculate total storage used by summing all non-deleted file sizes
    // Using Prisma's aggregate for efficient database-level calculation
    const storageStats = await prisma.file.aggregate({
      where: {
        userId: userId,
        deletedAt: null, // Only count non-deleted files
        isFolder: false, // Folders don't take up storage space
      },
      _sum: {
        size: true,
      },
      _count: {
        id: true, // Count of files
      },
    })

    const totalBytesUsed = storageStats._sum.size || 0
    const fileCount = storageStats._count.id || 0
    const percentageUsed = (totalBytesUsed / STORAGE_LIMIT_BYTES) * 100
    const bytesRemaining = Math.max(0, STORAGE_LIMIT_BYTES - totalBytesUsed)

    // Format bytes to human-readable format
    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return "0 B"
      const k = 1024
      const sizes = ["B", "KB", "MB", "GB", "TB"]
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`
    }

    return NextResponse.json({
      used: totalBytesUsed,
      limit: STORAGE_LIMIT_BYTES,
      remaining: bytesRemaining,
      percentage: Math.min(100, Math.round(percentageUsed * 100) / 100), // Round to 2 decimal places
      fileCount: fileCount,
      formatted: {
        used: formatBytes(totalBytesUsed),
        limit: formatBytes(STORAGE_LIMIT_BYTES),
        remaining: formatBytes(bytesRemaining),
      },
    })
  } catch (error) {
    console.error("Error calculating storage:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

