"use client"

import { Cloud, Search, Filter, HelpCircle, Settings, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { UserProfilePopup } from "./UserProfilePopup"
import { SearchResults } from "./SearchResults"
import Image from "next/image"

interface TopBarProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function TopBar({ user }: TopBarProps) {
  const [showProfilePopup, setShowProfilePopup] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [imageError, setImageError] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const userInitial = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"

  // Focus search on Ctrl/Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        searchInputRef.current?.focus()
        setShowSearchResults(true)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false)
      }
    }

    if (showSearchResults) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showSearchResults])

  return (
    <>
      <header className="flex h-14 items-center border-b border-slate-200 bg-white px-6 shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 shadow-sm">
            <Cloud className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-semibold text-slate-900">TwoSpoonDrive</span>
        </div>

        {/* Search Bar */}
        <div
          ref={searchContainerRef}
          className="relative mx-auto flex flex-1 items-center justify-center max-w-2xl px-8"
        >
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search in Drive"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowSearchResults(true)
              }}
              onFocus={() => {
                if (searchQuery.trim()) {
                  setShowSearchResults(true)
                }
              }}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-11 pr-20 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("")
                  setShowSearchResults(false)
                }}
                className="absolute right-12 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition-colors hover:bg-slate-100"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500 md:inline shadow-sm">
                ⌘K
              </kbd>
              <button className="rounded-full p-1.5 transition-colors hover:bg-slate-100">
                <Filter className="h-5 w-5 text-slate-400" />
              </button>
            </div>
          </div>
          {showSearchResults && searchQuery.trim() && (
            <SearchResults
              query={searchQuery}
              isOpen={showSearchResults}
              onClose={() => setShowSearchResults(false)}
            />
          )}
        </div>

        {/* Right Icons */}
        <div className="flex items-center gap-1">
          <button className="rounded-full p-2 transition-colors hover:bg-slate-100">
            <HelpCircle className="h-5 w-5 text-slate-600 hover:text-slate-900" />
          </button>
          <button className="rounded-full p-2 transition-colors hover:bg-slate-100">
            <Settings className="h-5 w-5 text-slate-600 hover:text-slate-900" />
          </button>
          <button
            onClick={() => setShowProfilePopup(!showProfilePopup)}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-700 text-white text-sm font-medium hover:ring-2 hover:ring-blue-300 transition-all cursor-pointer overflow-hidden shadow-sm"
          >
            {user?.image && !imageError ? (
              <Image
                key={user.image}
                src={user.image}
                alt={user.name || "User"}
                className="h-full w-full object-cover"
                onLoad={() => setImageError(false)}
                onError={() => setImageError(true)}
                width={32}
                height={32}
              />
            ) : (
              userInitial
            )}
          </button>
        </div>
      </header>
      {showProfilePopup && user && (
        <UserProfilePopup user={user} onClose={() => setShowProfilePopup(false)} />
      )}
    </>
  )
}
