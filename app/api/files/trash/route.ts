import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch all deleted files and folders for the user
    const files = await prisma.file.findMany({
      where: {
        userId: session.user.id,
        deletedAt: {
          not: null, // Only show deleted files
        },
      },
      orderBy: [
        { isFolder: "desc" }, // Folders first
        { deletedAt: "desc" }, // Most recently deleted first
      ],
    })

    return NextResponse.json({ files })
  } catch (error) {
    console.error("Error fetching trash:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

