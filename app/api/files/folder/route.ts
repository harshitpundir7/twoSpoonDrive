import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, parentId } = body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 })
    }

    // Validate parent folder exists and belongs to user (if provided)
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

    // Check if folder with same name already exists in the same parent
    const existing = await prisma.file.findFirst({
      where: {
        userId: session.user.id,
        parentId: parentId || null,
        name: name.trim(),
        isFolder: true,
        deletedAt: null,
      },
    })

    if (existing) {
      return NextResponse.json({ error: "A folder with this name already exists" }, { status: 409 })
    }

    // Create the folder
    const folder = await prisma.file.create({
      data: {
        name: name.trim(),
        type: "folder",
        size: 0,
        path: null,
        storageType: "local",
        userId: session.user.id,
        parentId: parentId || null,
        isFolder: true,
      },
    })

    return NextResponse.json({ folder }, { status: 201 })
  } catch (error) {
    console.error("Error creating folder:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

