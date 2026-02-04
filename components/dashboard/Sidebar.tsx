"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { HardDrive, Users, Star, Trash2, ChevronRight } from "lucide-react"
import { NewFileMenu } from "./NewFileMenu"

interface SidebarProps {
  onNewFolder: () => void
  onFileUpload: () => void
  onFolderUpload: () => void
}

interface StorageStats {
  used: number
  limit: number
  remaining: number
  percentage: number
  fileCount: number
  formatted: {
    used: string
    limit: string
    remaining: string
  }
}

export function Sidebar({ onNewFolder, onFileUpload, onFolderUpload }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null)
  const [isLoadingStorage, setIsLoadingStorage] = useState(true)

  const isTrash = pathname === "/dashboard/trash"
  const isMyDrive = pathname === "/dashboard" || pathname.startsWith("/dashboard/folders/")
  const isSharedWithMe = pathname === "/dashboard/shared"
  const isStarred = pathname === "/dashboard/starred"

  // Fetch storage statistics
  useEffect(() => {
    const fetchStorageStats = async () => {
      try {
        const res = await fetch("/api/storage")
        if (res.ok) {
          const data = await res.json()
          setStorageStats(data)
        }
      } catch (error) {
        console.error("Error fetching storage stats:", error)
      } finally {
        setIsLoadingStorage(false)
      }
    }

    fetchStorageStats()

    // Refresh storage stats every 30 seconds
    const interval = setInterval(fetchStorageStats, 30000)
    return () => clearInterval(interval)
  }, [])

  // Listen for storage updates (when files are uploaded/deleted)
  useEffect(() => {
    const handleStorageUpdate = () => {
      fetch("/api/storage")
        .then((res) => res.json())
        .then((data) => setStorageStats(data))
        .catch((error) => console.error("Error updating storage stats:", error))
    }

    window.addEventListener("storage:update", handleStorageUpdate)
    return () => window.removeEventListener("storage:update", handleStorageUpdate)
  }, [])

  const navItems: Array<{
    icon: typeof HardDrive
    label: string
    active: boolean
    path?: string
    collapsed?: boolean
  }> = [
    { icon: HardDrive, label: "My Drive", active: isMyDrive, path: "/dashboard" },
    { icon: Users, label: "Shared with me", active: isSharedWithMe, path: "/dashboard/shared" },
    { icon: Star, label: "Starred", active: isStarred, path: "/dashboard/starred" },
    { icon: Trash2, label: "Trash", active: isTrash, path: "/dashboard/trash" },
  ]

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.path) {
      router.push(item.path)
    }
  }

  return (
    <aside className="w-[240px] border-r border-slate-200 bg-white p-3">
      {/* New Button with Menu */}
      <div className="mb-3">
        <NewFileMenu
          onNewFolder={onNewFolder}
          onFileUpload={onFileUpload}
          onFolderUpload={onFolderUpload}
        />
      </div>

      {/* Navigation Items */}
      <nav className="space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item)}
              className={`flex cursor-pointer w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                item.active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${item.active ? "text-blue-600" : "text-slate-500"}`} />
              <span className="flex-1 text-left font-medium">{item.label}</span>
              {item.collapsed && (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Storage Section */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-medium text-slate-900">Storage</span>
          {storageStats && (
            <span className="text-xs text-slate-500">
              ({Math.round(storageStats.percentage)}% full)
            </span>
          )}
        </div>
        {isLoadingStorage ? (
          <div className="mb-2 text-xs text-slate-500">Loading...</div>
        ) : storageStats ? (
          <>
            <div className="mb-2 text-xs text-slate-600">
              {storageStats.formatted.used} of {storageStats.formatted.limit} used
            </div>
            <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all ${
                  storageStats.percentage >= 90
                    ? "bg-red-500"
                    : storageStats.percentage >= 75
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(100, storageStats.percentage)}%` }}
              />
            </div>
          </>
        ) : (
          <div className="mb-2 text-xs text-slate-500">Unable to load storage</div>
        )}
      </div>
    </aside>
  )
}
