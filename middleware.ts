import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req
  const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
  const isOnApiAuth = nextUrl.pathname.startsWith("/api/auth")
  const isOnShared = nextUrl.pathname.startsWith("/shared")
  const isOnApiShared = nextUrl.pathname.startsWith("/api/shared")

  // Allow all API auth routes - these handle their own redirects
  if (isOnApiAuth) {
    return NextResponse.next()
  }

  // Allow public shared file routes (no authentication required)
  if (isOnShared || isOnApiShared) {
    return NextResponse.next()
  }

  // Check for valid session token in cookies (Edge Runtime compatible)
  // NextAuth v5 uses specific cookie names - check for the actual session token cookie
  const sessionToken = req.cookies.get("authjs.session-token")?.value ||
                       req.cookies.get("__Secure-authjs.session-token")?.value ||
                       req.cookies.get("next-auth.session-token")?.value ||
                       req.cookies.get("__Secure-next-auth.session-token")?.value

  const isLoggedIn = !!sessionToken

  // Only protect dashboard routes (including /dashboard/folders/*) - redirect to home if not logged in
  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/", nextUrl))
  }

  // Don't redirect logged-in users away from home page
  // This prevents redirect loops after logout
  // Users can manually navigate to dashboard if they want

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
