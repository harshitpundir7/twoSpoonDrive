import { auth } from "@/auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
    })
  } catch (error) {
    console.error("Error fetching session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

