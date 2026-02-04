"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileGrid } from "@/components/dashboard/FileGrid"
import { ContextMenu } from "@/components/dashboard/ContextMenu"
import { RenameDialog } from "@/components/dashboard/RenameDialog"
import { ToastContainer, ToastType } from "@/components/dashboard/Toast"
import { ShareDialog } from "@/components/dashboard/ShareDialog"
import { FileTypeCategory } from "@/lib/fileTypes"
import { ModifiedFilterOption } from "@/components/dashboard/ModifiedFilter"

interface File {
  id: string
  name: string
  type?: string | null
  isFolder: boolean
  isStarred?: boolean
  ownerName?: string | null
}

export default function StarredPage() {
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

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    return id
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const fetchStarredFiles = async () => {
    try {
      setIsLoadingFiles(true)
      const res = await fetch("/api/files/starred")
      if (!res.ok) {
        throw new Error("Failed to fetch starred files")
      }
      const data = await res.json()
      setFiles(data.files || [])
    } catch (error) {
      console.error("Error fetching starred files:", error)
      addToast("Failed to load starred files", "error")
    } finally {
      setIsLoadingFiles(false)
    }
  }

  useEffect(() => {
    fetchStarredFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      addToast("File downloaded", "success")
    } catch (error) {
      console.error("Error downloading file:", error)
      addToast("Failed to download file", "error")
    }
  }

  const handleFileClick = (fileId: string, isFolder: boolean) => {
    if (isFolder) {
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
      fetchStarredFiles()
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

  const handleMoveToTrash = async (fileId: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        throw new Error("Failed to delete")
      }

      addToast("Moved to trash", "success")
      fetchStarredFiles()
    } catch (error) {
      console.error("Error deleting:", error)
      addToast("Failed to delete", "error")
    }
  }

  const handleStar = async (fileId: string, isStarred: boolean) => {
    try {
      const res = await fetch(`/api/files/${fileId}/star`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isStarred }),
      })

      if (!res.ok) {
        throw new Error("Failed to update star status")
      }

      fetchStarredFiles()
    } catch (error) {
      console.error("Error updating star status:", error)
      addToast("Failed to update star status", "error")
    }
  }

  return (
    <>
      <FileGrid
        files={files}
        breadcrumbPath={[{ id: "starred", name: "Starred" }]}
        currentFolderId={null}
        onFileContextMenu={handleFileContextMenu}
        onFileClick={handleFileClick}
        onNavigate={() => {}}
        onNewFolder={undefined}
        onFileUpload={undefined}
        onFolderUpload={undefined}
        onDownload={undefined}
        onRename={undefined}
        onShare={undefined}
        onMoveToTrash={undefined}
        onStar={handleStar}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        modifiedFilter={modifiedFilter}
        onModifiedFilterChange={setModifiedFilter}
        onMove={undefined}
        isLoading={isLoadingFiles}
        emptyStateImage="/starred.png"
      />
      {contextMenuPos && selectedFile && (
        <ContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          fileId={selectedFile.id}
          isFolder={selectedFile.isFolder}
          isStarred={files.find((f) => f.id === selectedFile.id)?.isStarred || false}
          onClose={handleCloseContextMenu}
          onDownload={() => {
            handleDownload(selectedFile.id)
            handleCloseContextMenu()
          }}
          onDelete={() => {
            handleMoveToTrash(selectedFile.id)
            handleCloseContextMenu()
          }}
          onRename={() => handleRename(selectedFile.id)}
          onDuplicate={undefined}
          onShare={handleShare}
          onStar={handleStar}
        />
      )}
      {showRenameDialog && fileToRename && (
        <RenameDialog
          isOpen={showRenameDialog}
          onClose={() => setShowRenameDialog(false)}
          onRename={handleRenameConfirm}
          currentName={fileToRename.name}
          isFolder={fileToRename.isFolder}
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

