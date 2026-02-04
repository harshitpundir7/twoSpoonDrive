"use client"

import { useState, useEffect, useRef } from "react"
import { File, Folder, X, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface SearchFile {
  id: string
  name: string
  type?: string | null
  isFolder: boolean
  parentId?: string | null
  updatedAt: string
  createdAt: string
  size?: number | null
}

interface SearchResultsProps {
  query: string
  isOpen: boolean
  onClose: () => void
}

export function SearchResults({ query, isOpen, onClose }: SearchResultsProps) {
  const [results, setResults] = useState<SearchFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setResults([])
      return
    }

    // Debounce search to avoid excessive API calls
    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/files/search?q=${encodeURIComponent(query.trim())}`)
        
        if (!res.ok) {
          if (res.status === 401) {
            setError("Please sign in to search files")
            return
          }
          throw new Error("Failed to search files")
        }

        const data = await res.json()
        setResults(data.files || [])
      } catch (err) {
        console.error("Search error:", err)
        setError("Failed to search files. Please try again.")
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [query, isOpen])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  const handleFileClick = (file: SearchFile) => {
    if (file.isFolder) {
      router.push(`/dashboard/folders/${file.id}`)
    } else {
      // For files, trigger download
      window.location.href = `/api/files/${file.id}/download`
    }
    onClose()
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
    const parts = text.split(regex)

    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark key={index} className="bg-yellow-200 text-[#202124]">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return date.toLocaleDateString()
  }

  const formatSize = (bytes: number | null | undefined) => {
    if (!bytes || bytes === 0) return ""
    const kb = bytes / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    const gb = mb / 1024
    return `${gb.toFixed(2)} GB`
  }

  if (!isOpen) return null

  return (
    <div
      ref={resultsRef}
      className="absolute left-1/2 top-full z-50 mt-2 w-full max-w-2xl -translate-x-1/2 rounded-lg border border-[#dadce0] bg-white shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#dadce0] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#202124]">
            {isLoading ? "Searching..." : `Results for "${query}"`}
          </span>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-[#5f6368]" />}
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 transition-colors hover:bg-[#f1f3f4]"
        >
          <X className="h-4 w-4 text-[#5f6368]" />
        </button>
      </div>

      {/* Results */}
      <div className="max-h-96 overflow-y-auto">
        {error ? (
          <div className="px-4 py-8 text-center text-sm text-red-600">{error}</div>
        ) : results.length === 0 && !isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-[#5f6368]">
            No files found matching "{query}"
          </div>
        ) : (
          <div className="divide-y divide-[#dadce0]">
            {results.map((file) => (
              <button
                key={file.id}
                onClick={() => handleFileClick(file)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f1f3f4]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#f1f3f4]">
                  {file.isFolder ? (
                    <Folder className="h-6 w-6 text-[#8ab4f8]" fill="currentColor" />
                  ) : (
                    <File className="h-6 w-6 text-[#9aa0a6]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#202124]">
                    {highlightMatch(file.name, query)}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[#5f6368]">
                    {file.isFolder ? (
                      <span>Folder</span>
                    ) : (
                      <>
                        {file.type && <span>{file.type}</span>}
                        {file.size && <span>• {formatSize(file.size)}</span>}
                      </>
                    )}
                    <span>• Modified {formatDate(file.updatedAt)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {results.length > 0 && (
        <div className="border-t border-[#dadce0] px-4 py-2 text-xs text-[#5f6368]">
          {results.length} result{results.length !== 1 ? "s" : ""} found
        </div>
      )}
    </div>
  )
}

