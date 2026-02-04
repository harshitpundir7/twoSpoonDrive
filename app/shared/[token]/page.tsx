"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Download, File, Folder, FileText, Loader2, AlertCircle } from "lucide-react"

interface SharedFileInfo {
  id: string
  name: string
  type?: string | null
  isFolder: boolean
  size?: number | null
  permission: "viewer" | "commenter" | "editor"
  ownerName?: string | null
}

export default function SharedFilePage() {
  const params = useParams()
  const token = params.token as string
  const [fileInfo, setFileInfo] = useState<SharedFileInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    if (!token) return

    const fetchFileInfo = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/shared/${token}`)
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.error || "Failed to load file")
        }
        const data = await res.json()
        setFileInfo(data)
      } catch (err) {
        console.error("Error fetching shared file:", err)
        setError(err instanceof Error ? err.message : "Failed to load file")
      } finally {
        setIsLoading(false)
      }
    }

    fetchFileInfo()
  }, [token])

  const handleDownload = async () => {
    if (!fileInfo || fileInfo.isFolder) return

    setIsDownloading(true)
    try {
      const res = await fetch(`/api/shared/${token}/download`)
      if (!res.ok) {
        throw new Error("Failed to download file")
      }

      // Get filename from Content-Disposition header or use a default
      const contentDisposition = res.headers.get("Content-Disposition")
      let fileName = fileInfo.name
      if (contentDisposition) {
        // Try standard format first: filename="name"
        const quotedMatch = contentDisposition.match(/filename="([^"]+)"/i)
        if (quotedMatch && quotedMatch[1]) {
          fileName = quotedMatch[1].trim()
        } else {
          // Fallback to unquoted format: filename=name
          const unquotedMatch = contentDisposition.match(/filename=([^;]+)/i)
          if (unquotedMatch && unquotedMatch[1]) {
            fileName = unquotedMatch[1].trim()
          }
        }
      }

      // Create blob from response
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)

      // Trigger download
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up blob URL
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error("Error downloading file:", error)
      alert("Failed to download file")
    } finally {
      setIsDownloading(false)
    }
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

  const getFileIcon = () => {
    if (fileInfo?.isFolder) {
      return <Folder className="h-16 w-16 text-blue-600" fill="currentColor" />
    }

    switch (fileInfo?.type) {
      case "application/pdf":
        return (
          <div className="flex h-16 w-16 items-center justify-center rounded bg-red-500 text-white">
            <span className="text-lg font-bold">PDF</span>
          </div>
        )
      case "text/plain":
        return <FileText className="h-16 w-16 text-slate-500" />
      default:
        return <File className="h-16 w-16 text-slate-500" />
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-8 shadow-2xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-slate-600">Loading shared file...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
            <h2 className="mb-2 text-xl font-semibold text-slate-900">Error</h2>
            <p className="text-sm text-slate-600">{error}</p>
            <p className="mt-4 text-xs text-slate-500">
              This link may be invalid, expired, or the file may have been deleted.
            </p>
          </div>
        ) : fileInfo ? (
          <>
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-50">
                {getFileIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="mb-1 truncate text-2xl font-semibold text-slate-900">
                  {fileInfo.name}
                </h1>
                {fileInfo.ownerName && (
                  <p className="text-sm text-slate-600">Shared by {fileInfo.ownerName}</p>
                )}
                {fileInfo.size && (
                  <p className="text-xs text-slate-500">{formatSize(fileInfo.size)}</p>
                )}
              </div>
            </div>

            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">Access level</span>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  {fileInfo.permission === "viewer"
                    ? "Viewer"
                    : fileInfo.permission === "commenter"
                    ? "Commenter"
                    : "Editor"}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {fileInfo.permission === "viewer"
                  ? "You can view this file"
                  : fileInfo.permission === "commenter"
                  ? "You can view and comment on this file"
                  : "You can view, comment, and edit this file"}
              </p>
            </div>

            {!fileInfo.isFolder && (
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    <span>Download</span>
                  </>
                )}
              </button>
            )}

            {fileInfo.isFolder && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-600">
                  Folder sharing is not yet supported. Please contact the owner for access.
                </p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}

