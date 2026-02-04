"use client"

import { useState, useEffect } from "react"
import {LogOut, Settings} from "lucide-react"
import { signOut } from "next-auth/react"

interface UserProfilePopupProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  onClose: () => void
}

export function UserProfilePopup({ user, onClose }: UserProfilePopupProps) {
  const [imageError, setImageError] = useState(false)

  const handleSignOut = async () => {
    await signOut({ redirectTo: "/" })
  }

  const userInitial = user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"

  // Reset image error when user changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageError(false)
  }, [user?.image])

  return (
    <>
      <div
        className="fixed right-4 top-16 z-50 w-80 rounded-lg border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* User Info Section */}
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
              {user.image && !imageError ? (
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="h-full w-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className="text-white text-lg font-medium">
                  {userInitial}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium text-slate-900">
                {user.name || "User"}
              </div>
              <div className="truncate text-xs text-slate-500">{user.email}</div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          <button className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50">
            <Settings className="h-5 w-5 text-slate-500" />
            <span>Settings</span>
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200" />

        {/* Sign Out */}
        <div className="p-2">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
          >
            <LogOut className="h-5 w-5 text-slate-500" />
            <span>Sign out</span>
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-3">
          <div className="text-xs text-slate-500">
            <div className="mb-1">Privacy Policy</div>
            <div>Terms of Service</div>
          </div>
        </div>
      </div>
      <div className="fixed inset-0 z-40" onClick={onClose} />
    </>
  )
}

