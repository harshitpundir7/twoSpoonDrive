"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { FileGrid } from "@/components/dashboard/FileGrid"
import { ContextMenu } from "@/components/dashboard/ContextMenu"
import { CreateFolderDialog } from "@/components/dashboard/CreateFolderDialog"
import { FileUpload } from "@/components/dashboard/FileUpload"
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
  isStarred?: boolean
}

export default function FolderPage() {
  const params = useParams()
  const router = useRouter()
  const folderId = params.folderId as string

  const [selectedFile, setSelectedFile] = useState<{ id: string; isFolder: boolean } | null>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [fileToRename, setFileToRename] = useState<{ id: string; name: string; isFolder: boolean } | null>(null)
  const [breadcrumbPath, setBreadcrumbPath] = useState<Array<{ id: string; name: string }>>([])
  const [typeFilter, setTypeFilter] = useState<FileTypeCategory>("all")
  const [modifiedFilter, setModifiedFilter] = useState<ModifiedFilterOption | null>(null)
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([])
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [fileToShare, setFileToShare] = useState<{ id: string; name: string; isFolder: boolean } | null>(null)

  useEffect(() => {
    // Listen for new folder event from sidebar
    const handleNewFolder = () => {
      setShowCreateFolderDialog(true)
    }
    const handleFileUpload = () => {
      setShowFileUpload(true)
    }
    window.addEventListener("dashboard:newFolder", handleNewFolder)
    window.addEventListener("dashboard:fileUpload", handleFileUpload)
    return () => {
      window.removeEventListener("dashboard:newFolder", handleNewFolder)
      window.removeEventListener("dashboard:fileUpload", handleFileUpload)
    }
  }, [])

  const fetchFiles = async (filterType: FileTypeCategory = typeFilter, modified: ModifiedFilterOption | null = modifiedFilter) => {
    try {
      setIsLoadingFiles(true)
      const params = new URLSearchParams()
      params.set("parentId", folderId)
      if (filterType !== "all") {
        params.set("type", filterType)
        params.set("recursive", "true") // Search recursively in folder and all children
      }
      if (modified && modified !== "all") {
        params.set("modified", modified)
      }
      const res = await fetch(`/api/files?${params.toString()}`)
      if (!res.ok) {
        if (res.status === 403 || res.status === 404) {
          // User doesn't have access or folder doesn't exist
          setFiles([])
          return
        }
        throw new Error("Failed to fetch files")
      }
      const data = await res.json()
      setFiles(data.files || [])
    } catch (error) {
      console.error("Error fetching files:", error)
      setFiles([])
    } finally {
      setIsLoadingFiles(false)
    }
  }

  const handleTypeFilterChange = (newType: FileTypeCategory) => {
    setTypeFilter(newType)
    fetchFiles(newType, modifiedFilter)
  }

  const handleModifiedFilterChange = (newModified: ModifiedFilterOption | null) => {
    setModifiedFilter(newModified)
    fetchFiles(typeFilter, newModified)
  }

  useEffect(() => {
    // Fetch breadcrumb path
    const fetchBreadcrumbPath = async () => {
      try {
        const res = await fetch(`/api/files/path?folderId=${folderId}`)
        if (res.ok) {
          const data = await res.json()
          setBreadcrumbPath(data.path || [])
        }
      } catch (error) {
        console.error("Error fetching breadcrumb path:", error)
        setBreadcrumbPath([])
      }
    }

    if (folderId) {
      fetchFiles(typeFilter)
      fetchBreadcrumbPath()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId])

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

      // Get filename from Content-Disposition header
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
    }
  }

  const handleCreateFolder = async (name: string) => {
    try {
      const res = await fetch("/api/files/folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          parentId: folderId,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create folder")
      }

      // Refresh files list
      fetchFiles()
    } catch (error) {
      console.error("Error creating folder:", error)
      alert(error instanceof Error ? error.message : "Failed to create folder")
      throw error
    }
  }

  const handleFileClick = (fileId: string, isFolder: boolean) => {
    if (isFolder) {
      router.push(`/dashboard/folders/${fileId}`)
    }
  }

  const handleNavigate = (targetFolderId: string | null) => {
    if (targetFolderId === null) {
      router.push("/dashboard")
    } else {
      router.push(`/dashboard/folders/${targetFolderId}`)
    }
  }

  const handleFileUpload = () => {
    setShowFileUpload(true)
  }

  const handleFolderUpload = () => {
    // TODO: Implement folder upload
    console.log("Folder upload clicked")
  }

  const handleFolderDownload = () => {
    // TODO: Implement folder download
    console.log("Folder download clicked")
  }

  const handleFolderRename = () => {
    // Get folder name from breadcrumb path (last item is current folder)
    const currentFolderName = breadcrumbPath.length > 0 
      ? breadcrumbPath[breadcrumbPath.length - 1].name 
      : "Folder"
    
    setFileToRename({ id: folderId, name: currentFolderName, isFolder: true })
    setShowRenameDialog(true)
  }
  
  const handleFolderRenameSubmit = async (newName: string) => {
    if (!fileToRename || fileToRename.id !== folderId) return

    try {
      const res = await fetch(`/api/files/${folderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to rename folder")
      }

      // Refresh breadcrumb path and files list
      const pathRes = await fetch(`/api/files/path?folderId=${folderId}`)
      if (pathRes.ok) {
        const pathData = await pathRes.json()
        setBreadcrumbPath(pathData.path || [])
      }
      fetchFiles()
    } catch (error) {
      console.error("Error renaming folder:", error)
      alert(error instanceof Error ? error.message : "Failed to rename folder")
      throw error // Re-throw to prevent dialog from closing
    }
  }

  const handleFolderShare = () => {
    // TODO: Implement folder share
    console.log("Folder share clicked")
  }

  const handleFolderMoveToTrash = async () => {
    if (!confirm("Are you sure you want to move this folder to trash? All files and subfolders inside will also be moved to trash.")) {
      return
    }

    try {
      const res = await fetch(`/api/files/${folderId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to delete folder")
      }

      // Navigate back to parent or root
      const parentFolder = breadcrumbPath.length > 0 ? breadcrumbPath[breadcrumbPath.length - 2] : null
      if (parentFolder) {
        router.push(`/dashboard/folders/${parentFolder.id}`)
      } else {
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Error deleting folder:", error)
      alert(error instanceof Error ? error.message : "Failed to delete folder")
    }
  }

  const handleDelete = async (fileId: string) => {
    if (!confirm("Are you sure you want to move this item to trash?")) {
      return
    }

    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to delete file")
      }

      // Refresh files list
      fetchFiles()
      // Dispatch storage update event to refresh sidebar
      window.dispatchEvent(new CustomEvent("storage:update"))
    } catch (error) {
      console.error("Error deleting file:", error)
      alert(error instanceof Error ? error.message : "Failed to delete file")
    }
  }

  const handleRename = (fileId: string) => {
    const file = files.find((f) => f.id === fileId)
    if (file) {
      setFileToRename({ id: file.id, name: file.name, isFolder: file.isFolder })
      setShowRenameDialog(true)
    }
  }

  const handleRenameSubmit = async (newName: string) => {
    if (!fileToRename) return

    // If renaming the current folder, use special handler
    if (fileToRename.id === folderId && fileToRename.isFolder) {
      return handleFolderRenameSubmit(newName)
    }

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
        throw new Error(error.error || "Failed to rename file")
      }

      // Refresh files list
      fetchFiles()
    } catch (error) {
      console.error("Error renaming file:", error)
      alert(error instanceof Error ? error.message : "Failed to rename file")
      throw error // Re-throw to prevent dialog from closing
    }
  }

  const handleMove = async (fileId: string, targetFolderId: string | null) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ parentId: targetFolderId }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to move file")
      }

      // Refresh files list
      fetchFiles()
    } catch (error) {
      console.error("Error moving file:", error)
      alert(error instanceof Error ? error.message : "Failed to move file")
    }
  }

  const addToast = (message: string, type: ToastType) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, message, type }])
    return id
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const handleDuplicate = async (fileId: string) => {
    if (isDuplicating) return // Prevent multiple clicks

    setIsDuplicating(true)
    const file = files.find((f) => f.id === fileId)
    const fileName = file?.name || "item"
    
    // Show loading toast
    addToast(`Duplicating ${fileName}...`, "loading")

    try {
      const res = await fetch(`/api/files/${fileId}/duplicate`, {
        method: "POST",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to duplicate file")
      }

      // Remove loading toast and show success
      setToasts((prev) => prev.filter((t) => t.type !== "loading"))
      addToast(`${fileName} duplicated successfully`, "success")

      // Refresh files list
      fetchFiles()
      // Dispatch storage update event to refresh sidebar
      window.dispatchEvent(new CustomEvent("storage:update"))
    } catch (error) {
      console.error("Error duplicating file:", error)
      // Remove loading toast and show error
      setToasts((prev) => prev.filter((t) => t.type !== "loading"))
      addToast(error instanceof Error ? error.message : "Failed to duplicate file", "error")
    } finally {
      setIsDuplicating(false)
    }
  }

  const handleShare = (fileId: string) => {
    const file = files.find((f) => f.id === fileId)
    if (file) {
      setFileToShare({ id: file.id, name: file.name, isFolder: file.isFolder })
      setShowShareDialog(true)
    }
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

      // Refresh files list
      fetchFiles()
      addToast(isStarred ? "Starred" : "Removed star", "success")
    } catch (error) {
      console.error("Error updating star status:", error)
      addToast("Failed to update star status", "error")
    }
  }

  return (
    <>
      {isLoadingFiles ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#2a2b2f] border-t-blue-500 mx-auto" />
            <p className="text-sm text-[#9aa0a6]">Loading files...</p>
          </div>
        </div>
      ) : (
        <FileGrid
          files={files}
          breadcrumbPath={breadcrumbPath}
          currentFolderId={folderId}
          onFileContextMenu={handleFileContextMenu}
          onFileClick={handleFileClick}
          onNavigate={handleNavigate}
          onNewFolder={() => setShowCreateFolderDialog(true)}
          onFileUpload={handleFileUpload}
          onFolderUpload={handleFolderUpload}
          onDownload={handleFolderDownload}
          onRename={handleFolderRename}
          onShare={handleFolderShare}
          onMoveToTrash={handleFolderMoveToTrash}
          onStar={handleStar}
          typeFilter={typeFilter}
          onTypeFilterChange={handleTypeFilterChange}
          modifiedFilter={modifiedFilter}
          onModifiedFilterChange={handleModifiedFilterChange}
          onMove={handleMove}
        />
      )}
      {contextMenuPos && selectedFile && (
        <ContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          fileId={selectedFile.id}
          isFolder={selectedFile.isFolder}
          isStarred={files.find((f) => f.id === selectedFile.id)?.isStarred || false}
          onClose={handleCloseContextMenu}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onRename={handleRename}
          onDuplicate={handleDuplicate}
          onShare={handleShare}
          onStar={handleStar}
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
      {showRenameDialog && fileToRename && (
        <RenameDialog
          isOpen={showRenameDialog}
          onClose={() => {
            setShowRenameDialog(false)
            setFileToRename(null)
          }}
          currentName={fileToRename.name}
          isFolder={fileToRename.isFolder}
          onRename={handleRenameSubmit}
        />
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <CreateFolderDialog
        isOpen={showCreateFolderDialog}
        onClose={() => setShowCreateFolderDialog(false)}
        onCreate={handleCreateFolder}
      />
      {showFileUpload && (
        <FileUpload
          parentId={folderId}
          onUploadComplete={fetchFiles}
          onClose={() => setShowFileUpload(false)}
        />
      )}
    </>
  )
}

