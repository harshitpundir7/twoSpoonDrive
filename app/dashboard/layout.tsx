"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TopBar } from "@/components/dashboard/TopBar"
import { Sidebar } from "@/components/dashboard/Sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<{
    name?: string | null
    email?: string | null
    image?: string | null
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch user session from API
    const fetchUser = async () => {
      try {
        setIsLoading(true)
        const res = await fetch("/api/user")
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/")
            return
          }
          throw new Error("Failed to fetch user")
        }
        const data = await res.json()
        if (data.user) {
          setUser(data.user)
        }
      } catch (error) {
        console.error("Error fetching user:", error)
        router.push("/")
      } finally {
        setIsLoading(false)
      }
    }
    fetchUser()
  }, [router])

  const handleFileUpload = () => {
    // Dispatch event to page components
    const event = new CustomEvent("dashboard:fileUpload")
    window.dispatchEvent(event)
  }

  const handleFolderUpload = () => {
    // TODO: Implement folder upload
    console.log("Folder upload clicked")
  }

  // Show loading state or redirect if no user
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 mx-auto" />
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <TopBar user={user} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          onNewFolder={() => {
            // This will be handled by the page component
            const event = new CustomEvent("dashboard:newFolder")
            window.dispatchEvent(event)
          }}
          onFileUpload={handleFileUpload}
          onFolderUpload={handleFolderUpload}
        />
        {children}
      </div>
    </div>
  )
}

