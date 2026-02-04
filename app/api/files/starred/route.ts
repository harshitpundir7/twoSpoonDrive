import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all starred files and folders
    const files = await prisma.file.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
        isStarred: true,
      },
      orderBy: [
        { isFolder: "desc" }, // Folders first
        { updatedAt: "desc" }, // Then by most recently updated
      ],
    })

    return NextResponse.json({ files })
  } catch (error) {
    console.error("Error fetching starred files:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

