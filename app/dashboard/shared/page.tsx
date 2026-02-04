"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileGrid } from "@/components/dashboard/FileGrid"
import { ContextMenu } from "@/components/dashboard/ContextMenu"
import { RenameDialog } from "@/components/dashboard/RenameDialog"
import { ToastContainer, ToastType } from "@/components/dashboard/Toast"
import { FileTypeCategory } from "@/lib/fileTypes"
import { ModifiedFilterOption } from "@/components/dashboard/ModifiedFilter"
import { ShareDialog } from "@/components/dashboard/ShareDialog"

interface File {
  id: string
  name: string
  type?: string | null
  isFolder: boolean
  size?: number | null
  createdAt: string
  updatedAt: string
  ownerName?: string | null
  ownerEmail?: string | null
}

export default function SharedWithMePage() {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<{ id: string; isFolder: boolean } | null>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [fileToRename, setFileToRename] = useState<{ id: string; name: string; isFolder: boolean } | null>(null)
  const [typeFilter, setTypeFilter] = useState<FileTypeCategory>("all")
  const [modifiedFilter, setModifiedFilter] = useState<ModifiedFilterOption | null>(null)
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([])
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [fileToShare, setFileToShare] = useState<{ id: string; name: string; isFolder: boolean } | null>(null)

  const fetchFiles = async (filterType: FileTypeCategory = typeFilter, modified: ModifiedFilterOption | null = modifiedFilter) => {
    try {
      setIsLoadingFiles(true)
      const params = new URLSearchParams()
      if (filterType !== "all") {
        params.set("type", filterType)
        params.set("recursive", "true")
      }
      if (modified && modified !== "all") {
        params.set("modified", modified)
      }
      const res = await fetch(`/api/files/shared?${params.toString()}`)
      if (!res.ok) {
        throw new Error("Failed to fetch shared files")
      }
      const data = await res.json()
      setFiles(data.files || [])
    } catch (error) {
      console.error("Error fetching shared files:", error)
    } finally {
      setIsLoadingFiles(false)
    }
  }

  useEffect(() => {
    fetchFiles(typeFilter)
  }, [])

  const handleTypeFilterChange = (newType: FileTypeCategory) => {
    setTypeFilter(newType)
    fetchFiles(newType, modifiedFilter)
  }

  const handleModifiedFilterChange = (newModified: ModifiedFilterOption | null) => {
    setModifiedFilter(newModified)
    fetchFiles(typeFilter, newModified)
  }

  const handleFileContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault()
    const file = files.find((f) => f.id === fileId)
    if (file) {
      setSelectedFile({ id: file.id, isFolder: file.isFolder })
      setContextMenuPos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleCloseContextMenu = () => {
    setContextMenuPos(null)
    setSelectedFile(null)
  }

  const handleDownload = async (fileId: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}/download`)
      if (!res.ok) {
        throw new Error("Failed to download file")
      }

      const contentDisposition = res.headers.get("Content-Disposition")
      let fileName = "download"
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

      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = blobUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error("Error downloading file:", error)
      addToast("Failed to download file", "error")
    }
  }

  const handleFileClick = (fileId: string, isFolder: boolean) => {
    if (isFolder) {
      // Navigate directly - access will be checked by the folder page
      router.push(`/dashboard/folders/${fileId}`)
    }
  }

  const handleRename = (fileId: string) => {
    const file = files.find((f) => f.id === fileId)
    if (file) {
      setFileToRename({ id: file.id, name: file.name, isFolder: file.isFolder })
      setShowRenameDialog(true)
    }
    handleCloseContextMenu()
  }

  const handleRenameConfirm = async (newName: string) => {
    if (!fileToRename) return

    try {
      const res = await fetch(`/api/files/${fileToRename.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to rename")
      }

      addToast(`${fileToRename.isFolder ? "Folder" : "File"} renamed successfully`, "success")
      setShowRenameDialog(false)
      setFileToRename(null)
      fetchFiles()
    } catch (error) {
      console.error("Error renaming:", error)
      addToast(error instanceof Error ? error.message : "Failed to rename", "error")
    }
  }

  const handleShare = (fileId: string) => {
    const file = files.find((f) => f.id === fileId)
    if (file) {
      setFileToShare({ id: file.id, name: file.name, isFolder: file.isFolder })
      setShowShareDialog(true)
    }
    handleCloseContextMenu()
  }

  const handleCopyLink = async (fileId: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}/share/copy-link`, {
        method: "POST",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to copy link")
      }

      const data = await res.json()
      await navigator.clipboard.writeText(data.shareLink)
      addToast("Link copied to clipboard!", "success")
    } catch (error) {
      console.error("Error copying link:", error)
      addToast(error instanceof Error ? error.message : "Failed to copy link", "error")
    }
  }

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, message, type }])
    return id
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <>
      <FileGrid
        files={files}
        breadcrumbPath={[]}
        currentFolderId={null}
        onFileContextMenu={handleFileContextMenu}
        onFileClick={handleFileClick}
        typeFilter={typeFilter}
        onTypeFilterChange={handleTypeFilterChange}
        modifiedFilter={modifiedFilter}
        onModifiedFilterChange={handleModifiedFilterChange}
        isLoading={isLoadingFiles}
        emptyStateImage="/sharedwithme.png"
      />
      {contextMenuPos && selectedFile && (
        <ContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          fileId={selectedFile.id}
          isFolder={selectedFile.isFolder}
          onClose={handleCloseContextMenu}
          onDownload={() => {
            handleDownload(selectedFile.id)
            handleCloseContextMenu()
          }}
          onRename={() => handleRename(selectedFile.id)}
          onShare={() => handleShare(selectedFile.id)}
        />
      )}
      {showRenameDialog && fileToRename && (
        <RenameDialog
          isOpen={showRenameDialog}
          onClose={() => {
            setShowRenameDialog(false)
            setFileToRename(null)
          }}
          currentName={fileToRename.name}
          isFolder={fileToRename.isFolder}
          onRename={handleRenameConfirm}
        />
      )}
      {showShareDialog && fileToShare && (
        <ShareDialog
          isOpen={showShareDialog}
          onClose={() => {
            setShowShareDialog(false)
            setFileToShare(null)
          }}
          fileId={fileToShare.id}
          fileName={fileToShare.name}
          isFolder={fileToShare.isFolder}
          onToast={addToast}
        />
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}

